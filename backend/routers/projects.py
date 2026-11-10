import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: Optional[str] = None
    status: Optional[str] = "active"
    color: Optional[str] = "#4338CA"
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    color: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    color: str
    created_at: Optional[datetime.datetime] = None
    task_total: int = 0
    task_done: int = 0
    progress: int = 0

    class Config:
        from_attributes = True


def _serialize(db: Session, project: models.Project) -> ProjectOut:
    tasks = db.query(models.Task).filter(models.Task.project_id == project.id).all()
    total = len(tasks)
    done = len([t for t in tasks if t.status == "done"])
    progress = int(round((done / total) * 100)) if total else 0
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        color=project.color,
        created_at=project.created_at,
        task_total=total,
        task_done=done,
        progress=progress,
    )


def _get_owned(db: Session, user: models.User, project_id: int) -> models.Project:
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.user_id == user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=List[ProjectOut])
def list_projects(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.Project).filter(models.Project.user_id == user.id)
    if status:
        q = q.filter(models.Project.status == status)
    projects = q.order_by(models.Project.created_at.desc()).all()
    return [_serialize(db, p) for p in projects]


@router.post("", response_model=ProjectOut)
def create_project(
    payload: ProjectIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = models.Project(
        user_id=user.id,
        name=payload.name.strip(),
        description=payload.description,
        status=payload.status or "active",
        color=payload.color or "#4338CA",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _serialize(db, project)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _serialize(db, _get_owned(db, user, project_id))


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = _get_owned(db, user, project_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if value is not None or key in ("description",):
            setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return _serialize(db, project)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = _get_owned(db, user, project_id)
    db.delete(project)
    db.commit()
    return {"ok": True, "deleted_id": project_id}
