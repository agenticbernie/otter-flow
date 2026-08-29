"""
LIVE e2e for the MVP pass: GitHub endpoints (unconnected paths + connect-url +
callback CSRF), telemetry events, project<->repo linking (manual fallback), and
deletion cascade (sessions/capsules/events). Uses real Clerk tokens.

The interactive GitHub OAuth (install + authorize) cannot be automated, so the
connected repo-list path is exercised manually by the user; here we verify every
server-side branch that does NOT require a completed OAuth handshake, plus the
callback's CSRF/state rejection.
"""
import os
import time
import asyncio
import requests
import asyncpg
import pytest
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

SK = os.environ["CLERK_SECRET_KEY"]
DB = os.environ["DATABASE_URL"]
CLERK_API = "https://api.clerk.com/v1"
H = {"Authorization": f"Bearer {SK}", "Content-Type": "application/json"}
BACKEND = os.environ.get("PUBLIC_API_URL", "https://flow-core-setup.preview.emergentagent.com")
API = f"{BACKEND}/api"


def _user(email):
    r = requests.post(f"{CLERK_API}/users", headers=H, json={
        "email_address": [email], "password": "S3cretPw!longenough", "skip_password_checks": True})
    assert r.ok, r.text
    return r.json()["id"]


def _sess(uid):
    return requests.post(f"{CLERK_API}/sessions", headers=H, json={"user_id": uid}).json()["id"]


def _del_user(uid):
    requests.delete(f"{CLERK_API}/users/{uid}", headers=H)


def _tok(sid):
    return requests.post(f"{CLERK_API}/sessions/{sid}/tokens", headers=H, json={}).json()["jwt"]


class C:
    def __init__(self, sid):
        self.sid = sid

    def h(self):
        return {"Authorization": f"Bearer {_tok(self.sid)}"}

    def get(self, p):
        return requests.get(f"{API}{p}", headers=self.h())

    def post(self, p, j=None):
        return requests.post(f"{API}{p}", headers=self.h(), json=j or {})

    def delete(self, p):
        return requests.delete(f"{API}{p}", headers=self.h())


async def _count_events(project_id):
    conn = await asyncpg.connect(DB, statement_cache_size=0)
    n = await conn.fetchval("select count(*) from events where project_id=$1", project_id)
    await conn.close()
    return n


def test_github_telemetry_repo_and_deletion():
    ts = int(time.time())
    uid_a, uid_b = _user(f"mvp_a_{ts}@e.com"), _user(f"mvp_b_{ts}@e.com")
    try:
        a, b = C(_sess(uid_a)), C(_sess(uid_b))

        # --- GitHub unconnected paths ---
        assert a.get("/github/status").json() == {"connected": False, "login": None}
        url = a.post("/github/connect-url").json()["url"]
        assert "github.com/apps/otter-flow/installations/new?state=" in url
        assert a.get("/github/repos").status_code == 404          # not connected
        assert a.delete("/github/disconnect").status_code == 204  # no-op safe

        # --- GitHub callback CSRF: bad/missing state redirects to error ---
        r = requests.get(f"{API}/github/callback?code=x&state=bogus", allow_redirects=False)
        assert r.status_code in (302, 307)
        assert "github=error" in r.headers.get("location", "")
        r = requests.get(f"{API}/github/callback", allow_redirects=False)
        assert "github=error" in r.headers.get("location", "")

        # --- Project + manual repo link fallback ---
        pid = a.post("/projects", {"name": "MVP Project"}).json()["id"]
        r = a.post(f"/projects/{pid}/link-repo", {
            "repo_url": "https://github.com/octocat/Hello-World",
            "repo_owner": "octocat", "repo_name": "Hello-World"})
        assert r.status_code == 200 and r.json()["repo_owner"] == "octocat"
        # persisted on GET
        assert a.get(f"/projects/{pid}").json()["repo_url"].endswith("Hello-World")
        # unlink
        assert a.delete(f"/projects/{pid}/repo").json()["repo_url"] is None

        # relink for later
        a.post(f"/projects/{pid}/link-repo", {"repo_url": "https://github.com/octocat/Hello-World"})

        # --- Telemetry: all 5 allowed types accepted; bad rejected ---
        for t in ["project_opened", "session_started", "session_ended", "capsule_created", "start_clicked"]:
            assert a.post("/events", {"type": t, "project_id": pid}).status_code == 201
        assert a.post("/events", {"type": "not_allowed"}).status_code == 400
        assert asyncio.run(_count_events(pid)) == 5

        # --- Ownership isolation on new endpoints ---
        assert b.post(f"/projects/{pid}/link-repo", {"repo_url": "https://github.com/x/y"}).status_code == 404
        assert b.delete(f"/projects/{pid}/repo").status_code == 404

        # --- Build session+capsule then delete project: cascade + events removed ---
        a.post(f"/projects/{pid}/sessions/start")
        a.post(f"/projects/{pid}/sessions/end", {"next_action": "wrap up"})
        assert a.get(f"/projects/{pid}/session-state").json()["pending_capsule"] is not None

        assert a.delete(f"/projects/{pid}").status_code == 204
        assert a.get(f"/projects/{pid}").status_code == 404              # project gone
        assert a.get(f"/projects/{pid}/session-state").status_code == 404  # sessions/capsules gone
        assert asyncio.run(_count_events(pid)) == 0                       # telemetry removed
    finally:
        _del_user(uid_a)
        _del_user(uid_b)


if __name__ == "__main__":
    test_github_telemetry_repo_and_deletion()
    print("MVP E2E PASSED")
