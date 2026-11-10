import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


class EventIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    start_time: datetime.datetime
    end_time: datetime.datetime
    location: Optional[str] = None
    category: Optional[str] = "general"


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime.datetime] = None
    end_time: Optional[datetime.datetime] = None
    location: Optional[str] = None
    category: Optional[str] = None


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


def _owned(db: Session, user: models.User, event_id: int) -> models.Event:
    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id, models.Event.user_id == user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/events", response_model=List[EventOut])
def list_events(
    from_: Optional[datetime.date] = None,
    to: Optional[datetime.date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.Event).filter(models.Event.user_id == user.id)
    if from_ is not None:
        q = q.filter(models.Event.start_time >= datetime.datetime.combine(from_, datetime.time.min))
    if to is not None:
        q = q.filter(models.Event.start_time <= datetime.datetime.combine(to, datetime.time.max))
    return q.order_by(models.Event.start_time.asc()).all()


@router.post("/events", response_model=EventOut)
def create_event(
    payload: EventIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if payload.end_time < payload.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")
    event = models.Event(
        user_id=user.id,
        title=payload.title.strip(),
        description=payload.description,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location,
        category=payload.category or "general",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _owned(db, user, event_id)


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    event = _owned(db, user, event_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None or key in ("description", "location"):
            setattr(event, key, value)
    if event.end_time < event.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    event = _owned(db, user, event_id)
    db.delete(event)
    db.commit()
    return {"ok": True, "deleted_id": event_id}
