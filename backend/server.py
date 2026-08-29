import logging
import os
from datetime import datetime, timezone
from typing import Annotated, List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Project, Session, Capsule, utcnow
from auth import CurrentUserId

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
    project = Project(
        owner_id=owner_id,
        name=payload.name.strip(),
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
        project.name = payload.name.strip()
    if payload.description is not None:
        project.description = payload.description.strip() or None
    await db.commit()
    await db.refresh(project)
    return project


@api_router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, owner_id: CurrentUserId, db: DbSession):
    project = await _get_owned_project(db, project_id, owner_id)
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

    capsule = Capsule(
        project_id=project_id,
        owner_id=owner_id,
        session_id=active.id,
        next_action=payload.next_action.strip(),
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



app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)
