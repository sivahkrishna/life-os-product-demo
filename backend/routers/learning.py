import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/learning", tags=["learning"])


# ---------------- skills ----------------
class SkillIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: Optional[str] = None
    level: Optional[int] = 1


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    level: Optional[int] = None


class SkillOut(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    level: int

    class Config:
        from_attributes = True


# ---------------- courses ----------------
class CourseIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    provider: Optional[str] = None
    status: Optional[str] = "in_progress"
    progress: Optional[int] = 0
    target_date: Optional[datetime.date] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    provider: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    target_date: Optional[datetime.date] = None


class CourseOut(BaseModel):
    id: int
    title: str
    provider: Optional[str] = None
    status: str
    progress: int
    target_date: Optional[datetime.date] = None

    class Config:
        from_attributes = True


# ---------------- career milestones ----------------
class MilestoneIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    date: datetime.date


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime.date] = None


class MilestoneOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    date: datetime.date

    class Config:
        from_attributes = True


def _clamp(value: Optional[int], low: int, high: int, default: int = 0) -> int:
    if value is None:
        return default
    return max(low, min(high, int(value)))


def _owned(db: Session, model, user: models.User, obj_id: int):
    obj = db.query(model).filter(model.id == obj_id, model.user_id == user.id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Record not found")
    return obj


# ---------------- skills routes ----------------
@router.get("/skills", response_model=List[SkillOut])
def list_skills(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Skill).filter(models.Skill.user_id == user.id).order_by(models.Skill.name.asc()).all()


@router.post("/skills", response_model=SkillOut)
def create_skill(
    payload: SkillIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    skill = models.Skill(
        user_id=user.id,
        name=payload.name.strip(),
        category=payload.category,
        level=_clamp(payload.level, 1, 5, 1),
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.get("/skills/{skill_id}", response_model=SkillOut)
def get_skill(skill_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _owned(db, models.Skill, user, skill_id)


@router.put("/skills/{skill_id}", response_model=SkillOut)
def update_skill(
    skill_id: int,
    payload: SkillUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    skill = _owned(db, models.Skill, user, skill_id)
    data = payload.model_dump(exclude_unset=True)
    if "level" in data and data["level"] is not None:
        data["level"] = _clamp(data["level"], 1, 5, skill.level)
    for key, value in data.items():
        if value is not None or key == "category":
            setattr(skill, key, value)
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/skills/{skill_id}")
def delete_skill(skill_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    skill = _owned(db, models.Skill, user, skill_id)
    db.delete(skill)
    db.commit()
    return {"ok": True, "deleted_id": skill_id}


# ---------------- courses routes ----------------
@router.get("/courses", response_model=List[CourseOut])
def list_courses(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Course).filter(models.Course.user_id == user.id).order_by(models.Course.id.desc()).all()


@router.post("/courses", response_model=CourseOut)
def create_course(
    payload: CourseIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    course = models.Course(
        user_id=user.id,
        title=payload.title.strip(),
        provider=payload.provider,
        status=payload.status or "in_progress",
        progress=_clamp(payload.progress, 0, 100, 0),
        target_date=payload.target_date,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/courses/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _owned(db, models.Course, user, course_id)


@router.put("/courses/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    course = _owned(db, models.Course, user, course_id)
    data = payload.model_dump(exclude_unset=True)
    if "progress" in data and data["progress"] is not None:
        data["progress"] = _clamp(data["progress"], 0, 100, course.progress)
    for key, value in data.items():
        if value is not None or key in ("provider", "target_date"):
            setattr(course, key, value)
    if course.progress >= 100:
        course.status = "completed"
    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    course = _owned(db, models.Course, user, course_id)
    db.delete(course)
    db.commit()
    return {"ok": True, "deleted_id": course_id}


# ---------------- career milestones routes ----------------
@router.get("/career-milestones", response_model=List[MilestoneOut])
def list_milestones(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.CareerMilestone)
        .filter(models.CareerMilestone.user_id == user.id)
        .order_by(models.CareerMilestone.date.asc())
        .all()
    )


@router.post("/career-milestones", response_model=MilestoneOut)
def create_milestone(
    payload: MilestoneIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    m = models.CareerMilestone(
        user_id=user.id,
        title=payload.title.strip(),
        description=payload.description,
        date=payload.date,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.get("/career-milestones/{milestone_id}", response_model=MilestoneOut)
def get_milestone(milestone_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _owned(db, models.CareerMilestone, user, milestone_id)


@router.put("/career-milestones/{milestone_id}", response_model=MilestoneOut)
def update_milestone(
    milestone_id: int,
    payload: MilestoneUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    m = _owned(db, models.CareerMilestone, user, milestone_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None or key == "description":
            setattr(m, key, value)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/career-milestones/{milestone_id}")
def delete_milestone(milestone_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    m = _owned(db, models.CareerMilestone, user, milestone_id)
    db.delete(m)
    db.commit()
    return {"ok": True, "deleted_id": milestone_id}
