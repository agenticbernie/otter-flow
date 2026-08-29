"""GitHub App user-authorization flow (user-to-server tokens only).

Client Secret and user tokens live only on the server; tokens are encrypted at
rest with Fernet. No app private key / installation tokens are used.
"""
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models import GithubConnection

load_dotenv(Path(__file__).parent / ".env")

CLIENT_ID = os.environ["GITHUB_CLIENT_ID"]
CLIENT_SECRET = os.environ["GITHUB_CLIENT_SECRET"]
APP_SLUG = os.environ["GITHUB_APP_SLUG"]
CALLBACK_URL = os.environ["GITHUB_CALLBACK_URL"]
FRONTEND_URL = os.environ["FRONTEND_URL"].rstrip("/")
_fernet = Fernet(os.environ["TOKEN_ENCRYPTION_KEY"].encode())

API = "https://api.github.com"
OAUTH = "https://github.com/login/oauth"
GH_VERSION = "2022-11-28"


def _now():
    return datetime.now(timezone.utc)


def encrypt(v: str) -> str:
    return _fernet.encrypt(v.encode()).decode()


def decrypt(v: str) -> str:
    return _fernet.decrypt(v.encode()).decode()


def gh_headers(token: str | None = None) -> dict:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": GH_VERSION}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


async def discover_verified_installation(token: str) -> int | None:
    """Discover the Otter Flow GitHub App installation accessible to the authenticated user.

    Uses GET /user/installations and verifies the installation belongs to this app
    via app_slug / app_id. Returns the verified installation id or None if not found.
    Does not rely on callback query installation_id.
    """
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{API}/user/installations?per_page=100", headers=gh_headers(token))
        if r.status_code == 401:
            return None
        r.raise_for_status()
        data = r.json()
        installations = data.get("installations", [])
        # Prefer exact match on app_slug, fallback to app_id
        app_id = os.environ.get("GITHUB_APP_ID", "")
        for inst in installations:
            inst_app_slug = inst.get("app_slug") or (inst.get("app") or {}).get("slug")
            inst_app_id = str(inst.get("app_id") or (inst.get("app") or {}).get("id") or "")
            if inst_app_slug == APP_SLUG or (app_id and inst_app_id == app_id):
                return inst.get("id")
        # Fallback: if no app_slug match but single installation exists and we have no better signal,
        # treat it as not verified (strict). Only return None to avoid picking wrong app.
        return None


def build_install_url(state: str) -> str:
    return f"https://github.com/apps/{APP_SLUG}/installations/new?" + urlencode({"state": state})


async def exchange_code(code: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{OAUTH}/access_token",
            params={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "code": code,
                "redirect_uri": CALLBACK_URL,
            },
            headers={"Accept": "application/json"},
        )
    if r.status_code != 200:
        raise HTTPException(400, "GitHub authorization failed")
    data = r.json()
    if "access_token" not in data:
        raise HTTPException(400, f"GitHub token exchange error: {data.get('error', 'unknown')}")
    return data


def apply_token_response(conn: GithubConnection, data: dict) -> None:
    conn.access_token_enc = encrypt(data["access_token"])
    if data.get("refresh_token"):
        conn.refresh_token_enc = encrypt(data["refresh_token"])
    if data.get("expires_in"):
        conn.access_expires_at = _now() + timedelta(seconds=int(data["expires_in"]))
    if data.get("refresh_token_expires_in"):
        conn.refresh_expires_at = _now() + timedelta(seconds=int(data["refresh_token_expires_in"]))


async def _refresh_if_needed(db: AsyncSession, conn: GithubConnection) -> str:
    if conn.access_expires_at is None or conn.access_expires_at > _now() + timedelta(minutes=1):
        return decrypt(conn.access_token_enc)
    if not conn.refresh_token_enc or (conn.refresh_expires_at and conn.refresh_expires_at <= _now()):
        raise HTTPException(401, "GitHub authorization expired; reconnect required")

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{OAUTH}/access_token",
            params={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": decrypt(conn.refresh_token_enc),
            },
            headers={"Accept": "application/json"},
        )
    if r.status_code != 200 or "access_token" not in r.json():
        raise HTTPException(401, "GitHub refresh failed; reconnect required")
    data = r.json()
    apply_token_response(conn, data)
    await db.commit()
    return data["access_token"]


async def fetch_granted_repos(db: AsyncSession, conn: GithubConnection) -> list[dict]:
    token = await _refresh_if_needed(db, conn)
    async with httpx.AsyncClient(timeout=15) as client:
        installs = await client.get(f"{API}/user/installations?per_page=100", headers=gh_headers(token))
        if installs.status_code == 401:
            raise HTTPException(401, "GitHub authorization expired; reconnect required")
        installs.raise_for_status()
        installations = installs.json().get("installations", [])
        ids = [x["id"] for x in installations]

        target = conn.installation_id if conn.installation_id in ids else (ids[0] if ids else None)
        if target is None:
            return []

        repos: list[dict] = []
        page = 1
        while True:
            r = await client.get(
                f"{API}/user/installations/{target}/repositories?per_page=100&page={page}",
                headers=gh_headers(token),
            )
            r.raise_for_status()
            batch = r.json().get("repositories", [])
            repos.extend(batch)
            if len(batch) < 100:
                break
            page += 1

    return [
        {"id": x["id"], "owner": x["owner"]["login"], "name": x["name"], "url": x["html_url"]}
        for x in repos
    ]


async def fetch_login(token: str) -> str | None:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{API}/user", headers=gh_headers(token))
    if r.status_code == 200:
        return r.json().get("login")
    return None


async def revoke_grant(access_token: str) -> None:
    async with httpx.AsyncClient(timeout=15) as client:
        await client.request(
            "DELETE",
            f"{API}/applications/{CLIENT_ID}/grant",
            json={"access_token": access_token},
            auth=(CLIENT_ID, CLIENT_SECRET),
            headers=gh_headers(),
        )
