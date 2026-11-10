import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class EventOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    start_time: datetime.datetime
    end_time: datetime.datetime
    location: Optional[str] = None
    category: str

    class Config:
        from_attributes = True


class AnalyticsOverview(BaseModel):
    tasks_completed_this_week: int
    tasks_total_this_week: int
    habit_avg_completion: float
    month_net_cashflow: float
    active_goals_count: int
    avg_goal_progress: float
    workouts_this_week: int
    upcoming_events: List[EventOut]
    events_this_week: int


@router.get("/overview", response_model=AnalyticsOverview)
def overview(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    now = datetime.datetime.utcnow()
    today = datetime.date.today()
    week_start_date = today - datetime.timedelta(days=today.weekday())
    week_start_dt = datetime.datetime.combine(week_start_date, datetime.time.min)
    week_end_dt = week_start_dt + datetime.timedelta(days=7)

    # ---- tasks this week (due_date or created_at inside the week) ----
    tasks = db.query(models.Task).filter(models.Task.user_id == user.id).all()
    week_tasks = [
        t
        for t in tasks
        if (t.due_date is not None and week_start_date <= t.due_date < week_start_date + datetime.timedelta(days=7))
        or (t.created_at is not None and week_start_dt <= t.created_at < week_end_dt)
    ]
    tasks_total_this_week = len(week_tasks)
    tasks_completed_this_week = len([t for t in week_tasks if t.status == "done"])

    # ---- habits: average 30-day completion rate ----
    habits = db.query(models.Habit).filter(models.Habit.user_id == user.id).all()
    rates: List[float] = []
    thirty_ago = today - datetime.timedelta(days=29)
    for h in habits:
        logs = (
            db.query(models.HabitLog)
            .filter(
                models.HabitLog.habit_id == h.id,
                models.HabitLog.date >= thirty_ago,
                models.HabitLog.date <= today,
                models.HabitLog.completed.is_(True),
            )
            .all()
        )
        distinct_days = len({log.date for log in logs})
        rates.append((distinct_days / 30.0) * 100.0)
    habit_avg_completion = round(sum(rates) / len(rates), 1) if rates else 0.0

    # ---- finance: this calendar month ----
    month_start = today.replace(day=1)
    txs = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user.id,
            models.Transaction.date >= month_start,
            models.Transaction.date <= today,
        )
        .all()
    )
    month_income = sum(t.amount for t in txs if t.type == "income")
    month_expense = sum(t.amount for t in txs if t.type == "expense")
    month_net_cashflow = round(month_income - month_expense, 2)

    # ---- goals ----
    goals = db.query(models.Goal).filter(models.Goal.user_id == user.id).all()
    active = [g for g in goals if g.status == "active"]
    active_goals_count = len(active)
    avg_goal_progress = (
        round(sum((g.progress or 0) for g in active) / len(active), 1) if active else 0.0
    )

    # ---- fitness ----
    workouts_this_week = (
        db.query(models.Workout)
        .filter(models.Workout.user_id == user.id, models.Workout.date >= week_start_date)
        .count()
    )

    # ---- events ----
    events_this_week = (
        db.query(models.Event)
        .filter(
            models.Event.user_id == user.id,
            models.Event.start_time >= week_start_dt,
            models.Event.start_time < week_end_dt,
        )
        .count()
    )
    upcoming = (
        db.query(models.Event)
        .filter(models.Event.user_id == user.id, models.Event.start_time >= now)
        .order_by(models.Event.start_time.asc())
        .limit(5)
        .all()
    )

    return AnalyticsOverview(
        tasks_completed_this_week=tasks_completed_this_week,
        tasks_total_this_week=tasks_total_this_week,
        habit_avg_completion=habit_avg_completion,
        month_net_cashflow=month_net_cashflow,
        active_goals_count=active_goals_count,
        avg_goal_progress=avg_goal_progress,
        workouts_this_week=workouts_this_week,
        upcoming_events=[EventOut.model_validate(e) for e in upcoming],
        events_this_week=events_this_week,
    )
