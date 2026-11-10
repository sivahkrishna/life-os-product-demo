import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/fitness", tags=["fitness"])


class WorkoutIn(BaseModel):
    type: str = Field(min_length=1, max_length=80)
    duration_minutes: int
    calories: Optional[int] = None
    date: datetime.date
    notes: Optional[str] = None


class WorkoutUpdate(BaseModel):
    type: Optional[str] = None
    duration_minutes: Optional[int] = None
    calories: Optional[int] = None
    date: Optional[datetime.date] = None
    notes: Optional[str] = None


class WorkoutOut(BaseModel):
    id: int
    type: str
    duration_minutes: int
    calories: Optional[int] = None
    date: datetime.date
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class WellnessIn(BaseModel):
    date: datetime.date
    mood: Optional[int] = None
    sleep_hours: Optional[float] = None
    water_glasses: Optional[int] = None
    weight: Optional[float] = None


class WellnessUpdate(BaseModel):
    date: Optional[datetime.date] = None
    mood: Optional[int] = None
    sleep_hours: Optional[float] = None
    water_glasses: Optional[int] = None
    weight: Optional[float] = None


class WellnessOut(BaseModel):
    id: int
    date: datetime.date
    mood: Optional[int] = None
    sleep_hours: Optional[float] = None
    water_glasses: Optional[int] = None
    weight: Optional[float] = None

    class Config:
        from_attributes = True


class FitnessSummary(BaseModel):
    workouts_this_week: int
    minutes_this_week: int
    calories_this_week: int
    avg_mood_7d: float
    avg_sleep_7d: float


def _owned(db: Session, model, user: models.User, obj_id: int):
    obj = db.query(model).filter(model.id == obj_id, model.user_id == user.id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Record not found")
    return obj


# ---------------- workouts ----------------
@router.get("/workouts", response_model=List[WorkoutOut])
def list_workouts(
    from_: Optional[datetime.date] = None,
    to: Optional[datetime.date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.Workout).filter(models.Workout.user_id == user.id)
    if from_ is not None:
        q = q.filter(models.Workout.date >= from_)
    if to is not None:
        q = q.filter(models.Workout.date <= to)
    return q.order_by(models.Workout.date.desc()).all()


@router.post("/workouts", response_model=WorkoutOut)
def create_workout(
    payload: WorkoutIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    w = models.Workout(
        user_id=user.id,
        type=payload.type.strip(),
        duration_minutes=int(payload.duration_minutes),
        calories=payload.calories,
        date=payload.date,
        notes=payload.notes,
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@router.get("/workouts/{workout_id}", response_model=WorkoutOut)
def get_workout(workout_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _owned(db, models.Workout, user, workout_id)


@router.put("/workouts/{workout_id}", response_model=WorkoutOut)
def update_workout(
    workout_id: int,
    payload: WorkoutUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    w = _owned(db, models.Workout, user, workout_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None or key == "notes":
            setattr(w, key, value)
    db.commit()
    db.refresh(w)
    return w


@router.delete("/workouts/{workout_id}")
def delete_workout(workout_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    w = _owned(db, models.Workout, user, workout_id)
    db.delete(w)
    db.commit()
    return {"ok": True, "deleted_id": workout_id}


# ---------------- wellness logs ----------------
@router.get("/wellness-logs", response_model=List[WellnessOut])
def list_wellness(
    from_: Optional[datetime.date] = None,
    to: Optional[datetime.date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.WellnessLog).filter(models.WellnessLog.user_id == user.id)
    if from_ is not None:
        q = q.filter(models.WellnessLog.date >= from_)
    if to is not None:
        q = q.filter(models.WellnessLog.date <= to)
    return q.order_by(models.WellnessLog.date.desc()).all()


@router.post("/wellness-logs", response_model=WellnessOut)
def create_wellness(
    payload: WellnessIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    log = models.WellnessLog(
        user_id=user.id,
        date=payload.date,
        mood=payload.mood,
        sleep_hours=payload.sleep_hours,
        water_glasses=payload.water_glasses,
        weight=payload.weight,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/wellness-logs/{log_id}", response_model=WellnessOut)
def get_wellness(log_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _owned(db, models.WellnessLog, user, log_id)


@router.put("/wellness-logs/{log_id}", response_model=WellnessOut)
def update_wellness(
    log_id: int,
    payload: WellnessUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    log = _owned(db, models.WellnessLog, user, log_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None or key == "date":
            setattr(log, key, value)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/wellness-logs/{log_id}")
def delete_wellness(log_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    log = _owned(db, models.WellnessLog, user, log_id)
    db.delete(log)
    db.commit()
    return {"ok": True, "deleted_id": log_id}


# ---------------- summary ----------------
@router.get("/summary", response_model=FitnessSummary)
def summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    today = datetime.date.today()
    week_start = today - datetime.timedelta(days=today.weekday())

    workouts = (
        db.query(models.Workout)
        .filter(models.Workout.user_id == user.id, models.Workout.date >= week_start)
        .all()
    )
    seven_ago = today - datetime.timedelta(days=6)
    wellness = (
        db.query(models.WellnessLog)
        .filter(models.WellnessLog.user_id == user.id, models.WellnessLog.date >= seven_ago)
        .all()
    )

    moods = [w.mood for w in wellness if w.mood is not None]
    sleeps = [w.sleep_hours for w in wellness if w.sleep_hours is not None]

    return FitnessSummary(
        workouts_this_week=len(workouts),
        minutes_this_week=int(sum((w.duration_minutes or 0) for w in workouts)),
        calories_this_week=int(sum((w.calories or 0) for w in workouts)),
        avg_mood_7d=round(sum(moods) / len(moods), 1) if moods else 0.0,
        avg_sleep_7d=round(sum(sleeps) / len(sleeps), 1) if sleeps else 0.0,
    )
