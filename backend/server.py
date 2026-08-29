import logging
import os
from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Project
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
