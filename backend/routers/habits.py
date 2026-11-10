import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/habits", tags=["habits"])


class HabitIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    frequency: Optional[str] = "daily"
    target_per_period: Optional[int] = 1
    color: Optional[str] = "#0D9488"


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    frequency: Optional[str] = None
    target_per_period: Optional[int] = None
    color: Optional[str] = None


class HabitOut(BaseModel):
    id: int
    name: str
    frequency: str
    target_per_period: int
    color: str

    class Config:
        from_attributes = True


class HabitLogIn(BaseModel):
    date: datetime.date
    completed: bool = True


class HabitLogOut(BaseModel):
    id: int
    habit_id: int
    date: datetime.date
    completed: bool

    class Config:
        from_attributes = True


class HabitSummaryItem(BaseModel):
    habit_id: int
    name: str
    streak: int
    completion_rate: float


def _get_owned(db: Session, user: models.User, habit_id: int) -> models.Habit:
    habit = (
        db.query(models.Habit)
        .filter(models.Habit.id == habit_id, models.Habit.user_id == user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit


def _streak(db: Session, habit_id: int) -> int:
    logs = (
        db.query(models.HabitLog)
        .filter(models.HabitLog.habit_id == habit_id, models.HabitLog.completed.is_(True))
        .all()
    )
    done = {log.date for log in logs}
    today = datetime.date.today()
    if today not in done:
        return 0
    streak = 0
    day = today
    while day in done:
        streak += 1
        day = day - datetime.timedelta(days=1)
    return streak


def _completion_rate(db: Session, habit_id: int, days: int = 30) -> float:
    today = datetime.date.today()
    start = today - datetime.timedelta(days=days - 1)
    logs = (
        db.query(models.HabitLog)
        .filter(
            models.HabitLog.habit_id == habit_id,
            models.HabitLog.date >= start,
            models.HabitLog.date <= today,
            models.HabitLog.completed.is_(True),
        )
        .all()
    )
    distinct_days = len({log.date for log in logs})
    return round((distinct_days / days) * 100, 1)


@router.get("", response_model=List[HabitOut])
def list_habits(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Habit)
        .filter(models.Habit.user_id == user.id)
        .order_by(models.Habit.created_at.asc())
        .all()
    )


@router.post("", response_model=HabitOut)
def create_habit(
    payload: HabitIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    habit = models.Habit(
        user_id=user.id,
        name=payload.name.strip(),
        frequency=payload.frequency or "daily",
        target_per_period=payload.target_per_period or 1,
        color=payload.color or "#0D9488",
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.get("/summary", response_model=List[HabitSummaryItem])
def summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    habits = db.query(models.Habit).filter(models.Habit.user_id == user.id).all()
    return [
        HabitSummaryItem(
            habit_id=h.id,
            name=h.name,
            streak=_streak(db, h.id),
            completion_rate=_completion_rate(db, h.id),
        )
        for h in habits
    ]


@router.get("/{habit_id}", response_model=HabitOut)
def get_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _get_owned(db, user, habit_id)


@router.put("/{habit_id}", response_model=HabitOut)
def update_habit(
    habit_id: int,
    payload: HabitUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    habit = _get_owned(db, user, habit_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(habit, key, value)
    db.commit()
    db.refresh(habit)
    return habit


@router.delete("/{habit_id}")
def delete_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    habit = _get_owned(db, user, habit_id)
    db.delete(habit)
    db.commit()
    return {"ok": True, "deleted_id": habit_id}


@router.post("/{habit_id}/log", response_model=HabitLogOut)
def log_habit(
    habit_id: int,
    payload: HabitLogIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _get_owned(db, user, habit_id)
    existing = (
        db.query(models.HabitLog)
        .filter(models.HabitLog.habit_id == habit_id, models.HabitLog.date == payload.date)
        .first()
    )
    if existing:
        existing.completed = payload.completed
        db.commit()
        db.refresh(existing)
        return existing
    log = models.HabitLog(habit_id=habit_id, date=payload.date, completed=payload.completed)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/{habit_id}/logs", response_model=List[HabitLogOut])
def habit_logs(
    habit_id: int,
    from_: Optional[datetime.date] = None,
    to: Optional[datetime.date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _get_owned(db, user, habit_id)
    q = db.query(models.HabitLog).filter(models.HabitLog.habit_id == habit_id)
    if from_ is not None:
        q = q.filter(models.HabitLog.date >= from_)
    if to is not None:
        q = q.filter(models.HabitLog.date <= to)
    return q.order_by(models.HabitLog.date.asc()).all()
