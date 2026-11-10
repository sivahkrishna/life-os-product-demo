import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    project_id: Optional[int] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime.date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime.date] = None


class TaskOut(BaseModel):
    id: int
    project_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[datetime.date] = None
    completed_at: Optional[datetime.datetime] = None
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


def _get_owned(db: Session, user: models.User, task_id: int) -> models.Task:
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _valid_project(db: Session, user: models.User, project_id: Optional[int]) -> Optional[int]:
    if project_id is None:
        return None
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.user_id == user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.id


@router.get("", response_model=List[TaskOut])
def list_tasks(
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.Task).filter(models.Task.user_id == user.id)
    if project_id is not None:
        q = q.filter(models.Task.project_id == project_id)
    if status:
        q = q.filter(models.Task.status == status)
    if priority:
        q = q.filter(models.Task.priority == priority)
    return q.order_by(models.Task.created_at.desc()).all()


@router.post("", response_model=TaskOut)
def create_task(
    payload: TaskIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project_id = _valid_project(db, user, payload.project_id)
    task = models.Task(
        user_id=user.id,
        project_id=project_id,
        title=payload.title.strip(),
        description=payload.description,
        status=payload.status or "todo",
        priority=payload.priority or "medium",
        due_date=payload.due_date,
    )
    if task.status == "done":
        task.completed_at = datetime.datetime.utcnow()
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _get_owned(db, user, task_id)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = _get_owned(db, user, task_id)
    data = payload.model_dump(exclude_unset=True)

    if "project_id" in data:
        data["project_id"] = _valid_project(db, user, data["project_id"])

    new_status = data.get("status")
    if new_status == "done" and task.completed_at is None:
        task.completed_at = datetime.datetime.utcnow()
    if new_status is not None and new_status != "done":
        task.completed_at = None

    for key, value in data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = _get_owned(db, user, task_id)
    db.delete(task)
    db.commit()
    return {"ok": True, "deleted_id": task_id}
