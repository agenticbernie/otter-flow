"""
Backend CRUD + ownership-isolation tests for Otter Flow (single event loop).

Clerk auth (get_current_user) is dependency-overridden so we exercise the real
Project CRUD routes and owner-scoping against the real Supabase DB without a
live Clerk OAuth token. All async work runs in ONE event loop so the asyncpg
connection pool stays valid.
"""
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import delete, select

import server
from database import AsyncSessionLocal
from models import User, Project
from auth import get_current_user

USER_A = f"test_user_a_{uuid.uuid4().hex[:8]}"
USER_B = f"test_user_b_{uuid.uuid4().hex[:8]}"
_current = {"id": USER_A}


def login_as(user_id):
    _current["id"] = user_id


@pytest.mark.asyncio
async def test_auth_crud_and_isolation():
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as api:
        # ---- unauthenticated is rejected (no override) ----
        server.app.dependency_overrides.pop(get_current_user, None)
        assert (await api.get("/api/projects")).status_code == 401
        assert (await api.post("/api/projects", json={"name": "x"})).status_code == 401

        # ---- seed two users ----
        async with AsyncSessionLocal() as db:
            await db.execute(delete(User).where(User.clerk_id.in_([USER_A, USER_B])))
            for cid in (USER_A, USER_B):
                db.add(User(clerk_id=cid, email=f"{cid}@test.dev", name=cid))
            await db.commit()

        server.app.dependency_overrides[get_current_user] = lambda: _current["id"]

        try:
            login_as(USER_A)

            # CREATE
            r = await api.post("/api/projects", json={"name": "Alpha", "description": "first"})
            assert r.status_code == 201, r.text
            pid = r.json()["id"]
            assert r.json()["name"] == "Alpha" and r.json()["description"] == "first"

            # LIST
            r = await api.get("/api/projects")
            assert r.status_code == 200 and any(p["id"] == pid for p in r.json())

            # READ
            r = await api.get(f"/api/projects/{pid}")
            assert r.status_code == 200 and r.json()["name"] == "Alpha"

            # UPDATE
            r = await api.put(f"/api/projects/{pid}", json={"name": "Alpha v2", "description": "edited"})
            assert r.status_code == 200 and r.json()["name"] == "Alpha v2"
            assert r.json()["description"] == "edited"

            # PERSISTENCE: read straight from DB
            async with AsyncSessionLocal() as db:
                row = (await db.execute(select(Project).where(Project.id == pid))).scalar_one_or_none()
                assert row is not None and row.name == "Alpha v2"

            # ---- ISOLATION: user B cannot touch A's project ----
            login_as(USER_B)
            assert all(p["id"] != pid for p in (await api.get("/api/projects")).json())
            assert (await api.get(f"/api/projects/{pid}")).status_code == 404
            assert (await api.put(f"/api/projects/{pid}", json={"name": "hacked"})).status_code == 404
            assert (await api.delete(f"/api/projects/{pid}")).status_code == 404

            # ---- A still owns it, then deletes ----
            login_as(USER_A)
            assert (await api.get(f"/api/projects/{pid}")).status_code == 200
            assert (await api.delete(f"/api/projects/{pid}")).status_code == 204
            assert (await api.get(f"/api/projects/{pid}")).status_code == 404
        finally:
            server.app.dependency_overrides.pop(get_current_user, None)
            async with AsyncSessionLocal() as db:
                await db.execute(delete(User).where(User.clerk_id.in_([USER_A, USER_B])))
                await db.commit()
