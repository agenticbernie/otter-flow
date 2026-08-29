import logging
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Annotated, List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Project, Session, Capsule, GithubConnection, OAuthState, Event, utcnow
from auth import CurrentUserId
import github_service as gh

app = FastAPI()
api_router = APIRouter(prefix="/api")

DbSession = Annotated[AsyncSession, Depends(get_db)]


# ---------------- Schemas ----------------
class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=5000)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=5000)


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    repo_id: Optional[int] = None
    repo_owner: Optional[str] = None
    repo_name: Optional[str] = None
    repo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------- Helpers ----------------
async def _get_owned_project(db: AsyncSession, project_id: str, owner_id: str) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == owner_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "Otter Flow API"}


@api_router.get("/me")
async def me(owner_id: CurrentUserId):
    return {"clerk_id": owner_id}


@api_router.post("/projects", response_model=ProjectOut, status_code=201)
async def create_project(payload: ProjectCreate, owner_id: CurrentUserId, db: DbSession):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Project name must not be empty or whitespace")
    project = Project(
        owner_id=owner_id,
        name=name,
        description=(payload.description.strip() if payload.description else None),
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@api_router.get("/projects", response_model=List[ProjectOut])
async def list_projects(owner_id: CurrentUserId, db: DbSession):
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == owner_id)
        .order_by(Project.created_at.desc())
    )
    return result.scalars().all()


@api_router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, owner_id: CurrentUserId, db: DbSession):
    return await _get_owned_project(db, project_id, owner_id)


@api_router.put("/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str, payload: ProjectUpdate, owner_id: CurrentUserId, db: DbSession
):
    project = await _get_owned_project(db, project_id, owner_id)
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Project name must not be empty or whitespace")
        project.name = name
    if payload.description is not None:
        project.description = payload.description.strip() or None
    await db.commit()
    await db.refresh(project)
    return project


@api_router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, owner_id: CurrentUserId, db: DbSession):
    project = await _get_owned_project(db, project_id, owner_id)
    # Sessions & capsules cascade via FK; remove telemetry events explicitly.
    await db.execute(delete(Event).where(Event.project_id == project_id, Event.owner_id == owner_id))
    await db.delete(project)
    await db.commit()
    return None


# ---------------- Session / Capsule schemas ----------------
class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None


class CapsuleCreate(BaseModel):
    next_action: str = Field(min_length=1, max_length=2000)
    workspace_pointer: Optional[str] = Field(default=None, max_length=2000)
    done_when: Optional[str] = Field(default=None, max_length=2000)
    estimated_minutes: Optional[int] = Field(default=None, ge=1, le=100000)


class CapsuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    session_id: Optional[str] = None
    next_action: str
    workspace_pointer: Optional[str] = None
    done_when: Optional[str] = None
    estimated_minutes: Optional[int] = None
    status: str
    consumed_at: Optional[datetime] = None
    created_at: datetime


class SessionStateOut(BaseModel):
    active_session: Optional[SessionOut] = None
    pending_capsule: Optional[CapsuleOut] = None


class LoopStepOut(BaseModel):
    session: SessionOut
    capsule: Optional[CapsuleOut] = None


# ---------------- Session / Capsule helpers ----------------
async def _get_active_session(db: AsyncSession, project_id: str, owner_id: str):
    result = await db.execute(
        select(Session).where(
            Session.project_id == project_id,
            Session.owner_id == owner_id,
            Session.status == "active",
        )
    )
    return result.scalar_one_or_none()


async def _get_latest_pending_capsule(db: AsyncSession, project_id: str, owner_id: str):
    result = await db.execute(
        select(Capsule)
        .where(
            Capsule.project_id == project_id,
            Capsule.owner_id == owner_id,
            Capsule.status == "pending",
        )
        .order_by(Capsule.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


# ---------------- Session / Capsule routes ----------------
@api_router.get("/projects/{project_id}/session-state", response_model=SessionStateOut)
async def get_session_state(project_id: str, owner_id: CurrentUserId, db: DbSession):
    await _get_owned_project(db, project_id, owner_id)
    active = await _get_active_session(db, project_id, owner_id)
    pending = await _get_latest_pending_capsule(db, project_id, owner_id)
    return SessionStateOut(active_session=active, pending_capsule=pending)


@api_router.post("/projects/{project_id}/sessions/start", response_model=SessionOut, status_code=201)
async def start_session(project_id: str, owner_id: CurrentUserId, db: DbSession):
    await _get_owned_project(db, project_id, owner_id)
    if await _get_active_session(db, project_id, owner_id) is not None:
        raise HTTPException(status_code=409, detail="A session is already active for this project")
    session = Session(project_id=project_id, owner_id=owner_id, status="active")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@api_router.post("/projects/{project_id}/sessions/end", response_model=LoopStepOut)
async def end_session(
    project_id: str, payload: CapsuleCreate, owner_id: CurrentUserId, db: DbSession
):
    await _get_owned_project(db, project_id, owner_id)
    active = await _get_active_session(db, project_id, owner_id)
    if active is None:
        raise HTTPException(status_code=409, detail="No active session to end")

    next_action = payload.next_action.strip()
    if not next_action:
        raise HTTPException(status_code=422, detail="next_action must not be empty or whitespace")
    capsule = Capsule(
        project_id=project_id,
        owner_id=owner_id,
        session_id=active.id,
        next_action=next_action,
        workspace_pointer=(payload.workspace_pointer.strip() if payload.workspace_pointer else None),
        done_when=(payload.done_when.strip() if payload.done_when else None),
        estimated_minutes=payload.estimated_minutes,
        status="pending",
    )
    active.status = "ended"
    active.ended_at = utcnow()
    db.add(capsule)
    await db.commit()
    await db.refresh(active)
    await db.refresh(capsule)
    return LoopStepOut(session=active, capsule=capsule)


@api_router.post("/capsules/{capsule_id}/start-now", response_model=LoopStepOut)
async def start_now(capsule_id: str, owner_id: CurrentUserId, db: DbSession):
    result = await db.execute(
        select(Capsule).where(Capsule.id == capsule_id, Capsule.owner_id == owner_id)
    )
    capsule = result.scalar_one_or_none()
    if capsule is None:
        raise HTTPException(status_code=404, detail="Capsule not found")
    if capsule.status == "consumed":
        raise HTTPException(status_code=409, detail="Capsule already started")
    if await _get_active_session(db, capsule.project_id, owner_id) is not None:
        raise HTTPException(status_code=409, detail="A session is already active for this project")

    session = Session(project_id=capsule.project_id, owner_id=owner_id, status="active")
    db.add(session)
    await db.flush()  # get session.id

    capsule.status = "consumed"
    capsule.consumed_at = utcnow()
    capsule.consumed_by_session_id = session.id
    await db.commit()
    await db.refresh(session)
    await db.refresh(capsule)
    return LoopStepOut(session=session, capsule=capsule)


# ---------------- Telemetry ----------------
ALLOWED_EVENTS = {
    "project_opened",
    "session_started",
    "session_ended",
    "capsule_created",
    "start_clicked",
}


class EventCreate(BaseModel):
    type: str
    project_id: Optional[str] = None


@api_router.post("/events", status_code=201)
async def create_event(payload: EventCreate, owner_id: CurrentUserId, db: DbSession):
    if payload.type not in ALLOWED_EVENTS:
        raise HTTPException(status_code=400, detail="Unknown event type")
    db.add(Event(owner_id=owner_id, project_id=payload.project_id, type=payload.type))
    await db.commit()
    return {"ok": True}


# ---------------- Project <-> Repo link ----------------
class RepoLink(BaseModel):
    repo_id: Optional[int] = None
    repo_owner: Optional[str] = Field(default=None, max_length=255)
    repo_name: Optional[str] = Field(default=None, max_length=255)
    repo_url: str = Field(min_length=1, max_length=2000)


@api_router.post("/projects/{project_id}/link-repo", response_model=ProjectOut)
async def link_repo(project_id: str, payload: RepoLink, owner_id: CurrentUserId, db: DbSession):
    project = await _get_owned_project(db, project_id, owner_id)
    repo_url = payload.repo_url.strip()
    if not repo_url:
        raise HTTPException(status_code=422, detail="repo_url must not be empty or whitespace")
    project.repo_id = payload.repo_id
    project.repo_owner = (payload.repo_owner.strip() if payload.repo_owner else None)
    project.repo_name = (payload.repo_name.strip() if payload.repo_name else None)
    project.repo_url = repo_url
    await db.commit()
    await db.refresh(project)
    return project


@api_router.delete("/projects/{project_id}/repo", response_model=ProjectOut)
async def unlink_repo(project_id: str, owner_id: CurrentUserId, db: DbSession):
    project = await _get_owned_project(db, project_id, owner_id)
    project.repo_id = None
    project.repo_owner = None
    project.repo_name = None
    project.repo_url = None
    await db.commit()
    await db.refresh(project)
    return project


# ---------------- GitHub App integration ----------------
class GithubStatus(BaseModel):
    connected: bool
    login: Optional[str] = None
    installation_id: Optional[int] = None
    needs_setup: bool = False


class RepoOut(BaseModel):
    id: int
    owner: str
    name: str
    url: str


async def _get_connection(db: AsyncSession, owner_id: str) -> Optional[GithubConnection]:
    res = await db.execute(select(GithubConnection).where(GithubConnection.owner_id == owner_id))
    return res.scalar_one_or_none()


@api_router.post("/github/connect-url")
async def github_connect_url(owner_id: CurrentUserId, db: DbSession):
    state = secrets.token_urlsafe(32)
    db.add(OAuthState(state=state, owner_id=owner_id, expires_at=utcnow() + timedelta(minutes=10)))
    await db.commit()
    return {"url": gh.build_install_url(state)}


@api_router.get("/github/callback")
async def github_callback(
    db: DbSession, code: Optional[str] = None, state: Optional[str] = None,
    installation_id: Optional[int] = None, setup_action: Optional[str] = None,
):
    dest = f"{gh.FRONTEND_URL}/?github="
    if not state:
        return RedirectResponse(dest + "error")

    res = await db.execute(select(OAuthState).where(OAuthState.state == state))
    st = res.scalar_one_or_none()
    if st is None or st.expires_at < utcnow():
        if st is not None:
            await db.delete(st)
            await db.commit()
        return RedirectResponse(dest + "error")

    owner_id = st.owner_id
    await db.delete(st)
    await db.commit()

    # Handle installation-only callbacks (no code) as setup updates for existing connections
    if not code:
        if installation_id is not None:
            conn = await _get_connection(db, owner_id)
            if conn is not None:
                conn.installation_id = installation_id
                # best-effort: refresh login if token still valid
                try:
                    token = gh.decrypt(conn.access_token_enc)
                    login = await gh.fetch_login(token)
                    if login:
                        conn.github_login = login
                except Exception:
                    pass
                await db.commit()
                return RedirectResponse(dest + "connected")
        return RedirectResponse(dest + "error")

    try:
        token_data = await gh.exchange_code(code)
    except HTTPException:
        return RedirectResponse(dest + "error")

    login = await gh.fetch_login(token_data["access_token"])
    conn = await _get_connection(db, owner_id)
    if conn is None:
        conn = GithubConnection(owner_id=owner_id)
        db.add(conn)
    # Only overwrite installation_id if GitHub provided one; preserve existing otherwise
    if installation_id is not None:
        conn.installation_id = installation_id
    conn.github_login = login
    gh.apply_token_response(conn, token_data)
    await db.commit()
    return RedirectResponse(dest + "connected")


@api_router.get("/github/status", response_model=GithubStatus)
async def github_status(owner_id: CurrentUserId, db: DbSession):
    conn = await _get_connection(db, owner_id)
    if conn is None:
        return GithubStatus(connected=False, needs_setup=False)
    needs_setup = conn.installation_id is None
    return GithubStatus(
        connected=True,
        login=conn.github_login,
        installation_id=conn.installation_id,
        needs_setup=needs_setup,
    )


@api_router.get("/github/repos", response_model=List[RepoOut])
async def github_repos(owner_id: CurrentUserId, db: DbSession):
    conn = await _get_connection(db, owner_id)
    if conn is None:
        raise HTTPException(status_code=404, detail="GitHub is not connected")
    return await gh.fetch_granted_repos(db, conn)


@api_router.delete("/github/disconnect", status_code=204)
async def github_disconnect(owner_id: CurrentUserId, db: DbSession):
    conn = await _get_connection(db, owner_id)
    if conn is not None:
        try:
            await gh.revoke_grant(gh.decrypt(conn.access_token_enc))
        except Exception:
            pass  # best-effort revoke; always remove local record
        await db.delete(conn)
        await db.commit()
    return None




app.include_router(api_router)

_cors_raw = os.environ.get('CORS_ORIGINS', '').strip()
if _cors_raw and _cors_raw != '*':
    _cors_origins = [o.strip() for o in _cors_raw.split(',') if o.strip()]
else:
    # Default: frontend origin + api subdomain; never use wildcard with credentials.
    _cors_origins = list({
        gh.FRONTEND_URL,
        os.environ.get('FRONTEND_URL', 'https://otterflow.hackon.team').rstrip('/'),
        'https://otterflow.hackon.team',
        'https://api.otterflow.hackon.team',
    })

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)
