"""
LIVE end-to-end test against the deployed Otter Flow API using REAL Clerk
session tokens minted via the Clerk Backend API (admin).

This exercises the real trust boundary: Clerk-signed JWT -> backend JWKS
verification -> Postgres CRUD -> per-user data isolation. Two separate Clerk
users are created; user B must never be able to see or mutate user A's data.

Clerk session tokens are short-lived, so a fresh token is minted immediately
before each request.
"""
import os
import time
import requests
import pytest
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

SK = os.environ["CLERK_SECRET_KEY"]
CLERK_API = "https://api.clerk.com/v1"
H = {"Authorization": f"Bearer {SK}", "Content-Type": "application/json"}

BACKEND = os.environ.get(
    "PUBLIC_API_URL", "https://flow-core-setup.preview.emergentagent.com"
)
API = f"{BACKEND}/api"


def _create_user(email):
    r = requests.post(
        f"{CLERK_API}/users",
        headers=H,
        json={"email_address": [email], "password": "S3cretPw!longenough", "skip_password_checks": True},
    )
    assert r.ok, f"create user failed: {r.status_code} {r.text}"
    return r.json()["id"]


def _create_session(uid):
    r = requests.post(f"{CLERK_API}/sessions", headers=H, json={"user_id": uid})
    assert r.ok, f"create session failed: {r.status_code} {r.text}"
    return r.json()["id"]


def _delete_user(uid):
    requests.delete(f"{CLERK_API}/users/{uid}", headers=H)


def _token(sid):
    r = requests.post(f"{CLERK_API}/sessions/{sid}/tokens", headers=H, json={})
    assert r.ok, f"mint token failed: {r.status_code} {r.text}"
    return r.json()["jwt"]


class Client:
    def __init__(self, sid):
        self.sid = sid

    def _h(self):
        return {"Authorization": f"Bearer {_token(self.sid)}"}

    def get(self, path):
        return requests.get(f"{API}{path}", headers=self._h())

    def post(self, path, json):
        return requests.post(f"{API}{path}", headers=self._h(), json=json)

    def put(self, path, json):
        return requests.put(f"{API}{path}", headers=self._h(), json=json)

    def delete(self, path):
        return requests.delete(f"{API}{path}", headers=self._h())


def test_live_auth_crud_and_isolation():
    ts = int(time.time())
    uid_a = _create_user(f"otter_a_{ts}@example.com")
    uid_b = _create_user(f"otter_b_{ts}@example.com")
    try:
        a = Client(_create_session(uid_a))
        b = Client(_create_session(uid_b))

        # No/invalid auth is rejected.
        assert requests.get(f"{API}/projects").status_code == 401
        assert requests.get(
            f"{API}/projects", headers={"Authorization": "Bearer garbage"}
        ).status_code == 401

        # CREATE (user A)
        r = a.post("/projects", {"name": "Live Alpha", "description": "hello"})
        assert r.status_code == 201, r.text
        pid = r.json()["id"]

        # LIST / READ (user A)
        assert any(p["id"] == pid for p in a.get("/projects").json())
        r = a.get(f"/projects/{pid}")
        assert r.status_code == 200 and r.json()["name"] == "Live Alpha"

        # UPDATE (user A)
        r = a.put(f"/projects/{pid}", {"name": "Live Alpha v2", "description": "edited"})
        assert r.status_code == 200 and r.json()["name"] == "Live Alpha v2"

        # ISOLATION (user B must not access A's project)
        assert all(p["id"] != pid for p in b.get("/projects").json())
        assert b.get(f"/projects/{pid}").status_code == 404
        assert b.put(f"/projects/{pid}", {"name": "hacked"}).status_code == 404
        assert b.delete(f"/projects/{pid}").status_code == 404

        # A still owns it, then deletes with success
        assert a.get(f"/projects/{pid}").status_code == 200
        assert a.delete(f"/projects/{pid}").status_code == 204
        assert a.get(f"/projects/{pid}").status_code == 404
    finally:
        _delete_user(uid_a)
        _delete_user(uid_b)


if __name__ == "__main__":
    test_live_auth_crud_and_isolation()
    print("LIVE E2E PASSED")
