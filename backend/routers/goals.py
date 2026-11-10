import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/goals", tags=["goals"])


class GoalIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: Optional[str] = "personal"
    description: Optional[str] = None
    target_date: Optional[datetime.date] = None
    progress: Optional[int] = 0
    status: Optional[str] = "active"


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[datetime.date] = None
    progress: Optional[int] = None
    status: Optional[str] = None


class GoalOut(BaseModel):
    id: int
    title: str
    category: str
    description: Optional[str] = None
    target_date: Optional[datetime.date] = None
    progress: int
    status: str

    class Config:
        from_attributes = True


def _clamp(value: Optional[int], low: int, high: int, default: int = 0) -> int:
    if value is None:
        return default
    return max(low, min(high, int(value)))


def _owned(db: Session, user: models.User, goal_id: int) -> models.Goal:
    goal = (
        db.query(models.Goal)
        .filter(models.Goal.id == goal_id, models.Goal.user_id == user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.get("", response_model=List[GoalOut])
def list_goals(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.Goal).filter(models.Goal.user_id == user.id)
    if category:
        q = q.filter(models.Goal.category == category)
    if status:
        q = q.filter(models.Goal.status == status)
    return q.order_by(models.Goal.id.desc()).all()


@router.post("", response_model=GoalOut)
def create_goal(
    payload: GoalIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    goal = models.Goal(
        user_id=user.id,
        title=payload.title.strip(),
        category=payload.category or "personal",
        description=payload.description,
        target_date=payload.target_date,
        progress=_clamp(payload.progress, 0, 100, 0),
        status=payload.status or "active",
    )
    if goal.progress >= 100 and goal.status == "active":
        goal.status = "completed"
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/{goal_id}", response_model=GoalOut)
def get_goal(goal_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _owned(db, user, goal_id)


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    goal = _owned(db, user, goal_id)
    data = payload.model_dump(exclude_unset=True)
    if "progress" in data and data["progress"] is not None:
        data["progress"] = _clamp(data["progress"], 0, 100, goal.progress)
    for key, value in data.items():
        if value is not None or key in ("description", "target_date"):
            setattr(goal, key, value)
    if goal.progress >= 100:
        goal.status = "completed"
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    goal = _owned(db, user, goal_id)
    db.delete(goal)
    db.commit()
    return {"ok": True, "deleted_id": goal_id}
