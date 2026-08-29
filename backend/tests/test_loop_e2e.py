"""
LIVE end-to-end test of the Session/Capsule core loop against the deployed API
using REAL Clerk session tokens (minted via the Clerk Backend API).

Loop: Start Session -> End Session (+ required next-action Capsule) ->
leave/return (session-state) -> Capsule appears -> Start Now -> new Session.
Also verifies: no multiple active sessions, ownership isolation, required field.
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
BACKEND = os.environ.get("PUBLIC_API_URL", "https://flow-core-setup.preview.emergentagent.com")
API = f"{BACKEND}/api"


def _create_user(email):
    r = requests.post(f"{CLERK_API}/users", headers=H, json={
        "email_address": [email], "password": "S3cretPw!longenough", "skip_password_checks": True})
    assert r.ok, f"{r.status_code} {r.text}"
    return r.json()["id"]


def _create_session(uid):
    r = requests.post(f"{CLERK_API}/sessions", headers=H, json={"user_id": uid})
    assert r.ok, f"{r.status_code} {r.text}"
    return r.json()["id"]


def _delete_user(uid):
    requests.delete(f"{CLERK_API}/users/{uid}", headers=H)


def _token(sid):
    r = requests.post(f"{CLERK_API}/sessions/{sid}/tokens", headers=H, json={})
    assert r.ok, f"{r.status_code} {r.text}"
    return r.json()["jwt"]


class Client:
    def __init__(self, sid):
        self.sid = sid

    def _h(self):
        return {"Authorization": f"Bearer {_token(self.sid)}"}

    def get(self, p):
        return requests.get(f"{API}{p}", headers=self._h())

    def post(self, p, json=None):
        return requests.post(f"{API}{p}", headers=self._h(), json=json or {})


def test_live_session_capsule_loop():
    ts = int(time.time())
    uid_a = _create_user(f"loop_a_{ts}@example.com")
    uid_b = _create_user(f"loop_b_{ts}@example.com")
    try:
        a = Client(_create_session(uid_a))
        b = Client(_create_session(uid_b))

        # Project owned by A
        pid = a.post("/projects", {"name": "Loop Project"}).json()["id"]

        # Initial state: nothing active/pending
        st = a.get(f"/projects/{pid}/session-state").json()
        assert st["active_session"] is None and st["pending_capsule"] is None

        # 1-3) Start session
        r = a.post(f"/projects/{pid}/sessions/start")
        assert r.status_code == 201, r.text
        assert r.json()["status"] == "active" and r.json()["started_at"]

        # Prevent multiple active sessions
        assert a.post(f"/projects/{pid}/sessions/start").status_code == 409

        # State reflects active session (refresh-safe)
        st = a.get(f"/projects/{pid}/session-state").json()
        assert st["active_session"] is not None and st["pending_capsule"] is None

        # 5) End requires next_action -> 422 when missing
        assert a.post(f"/projects/{pid}/sessions/end", {}).status_code == 422

        # 4-6) End session with a capsule
        r = a.post(f"/projects/{pid}/sessions/end", {
            "next_action": "Wire the Start Now button",
            "workspace_pointer": "src/components/SessionLoop.jsx",
            "done_when": "clicking it starts a session",
            "estimated_minutes": 25,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["session"]["status"] == "ended" and body["session"]["ended_at"]
        cap = body["capsule"]
        assert cap["next_action"] == "Wire the Start Now button"
        assert cap["status"] == "pending" and cap["estimated_minutes"] == 25
        cap_id = cap["id"]

        # 7) Return to project -> capsule appears, no active session
        st = a.get(f"/projects/{pid}/session-state").json()
        assert st["active_session"] is None
        assert st["pending_capsule"] and st["pending_capsule"]["id"] == cap_id

        # ---- ISOLATION: user B cannot touch A's project/capsule ----
        assert b.get(f"/projects/{pid}/session-state").status_code == 404
        assert b.post(f"/projects/{pid}/sessions/start").status_code == 404
        assert b.post(f"/capsules/{cap_id}/start-now").status_code == 404

        # 8-9) Start Now -> new active session + capsule consumed
        r = a.post(f"/capsules/{cap_id}/start-now")
        assert r.status_code == 200, r.text
        assert r.json()["session"]["status"] == "active"
        assert r.json()["capsule"]["status"] == "consumed"

        # Cannot start-now an already consumed capsule
        assert a.post(f"/capsules/{cap_id}/start-now").status_code == 409

        # State: active session again, no pending capsule
        st = a.get(f"/projects/{pid}/session-state").json()
        assert st["active_session"] is not None and st["pending_capsule"] is None

        # 10) Repeat the loop: end again produces a fresh pending capsule
        r = a.post(f"/projects/{pid}/sessions/end", {"next_action": "Second lap action"})
        assert r.status_code == 200
        st = a.get(f"/projects/{pid}/session-state").json()
        assert st["pending_capsule"]["next_action"] == "Second lap action"
    finally:
        _delete_user(uid_a)
        _delete_user(uid_b)


if __name__ == "__main__":
    test_live_session_capsule_loop()
    print("LOOP E2E PASSED")
