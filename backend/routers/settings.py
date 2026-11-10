import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user, hash_password, require_owner, verify_password
from database import get_db

router = APIRouter(prefix="/api/settings", tags=["settings"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}


class ProfileOut(BaseModel):
    id: int
    email: str
    name: str
    role: str

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=128)


class SiteSettingsOut(BaseModel):
    site_title: str
    tagline: str
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True


class SiteSettingsUpdate(BaseModel):
    site_title: Optional[str] = None
    tagline: Optional[str] = None


def _get_or_create_site(db: Session) -> models.SiteSettings:
    site = db.query(models.SiteSettings).first()
    if not site:
        site = models.SiteSettings(
            site_title="Life OS",
            tagline="Organize every part of your life, manually and mindfully.",
        )
        db.add(site)
        db.commit()
        db.refresh(site)
    return site


# ---------------- profile ----------------
@router.get("/profile", response_model=ProfileOut)
def get_profile(user: models.User = Depends(get_current_user)):
    return ProfileOut.model_validate(user)


@router.put("/profile", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    if data.get("email"):
        email = data["email"].strip().lower()
        clash = (
            db.query(models.User)
            .filter(models.User.email == email, models.User.id != user.id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=400, detail="That email is already in use")
        user.email = email
    if data.get("name"):
        user.name = data["name"].strip()
    db.commit()
    db.refresh(user)
    return ProfileOut.model_validate(user)


@router.put("/password")
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True, "message": "Password updated"}


# ---------------- site settings (public GET) ----------------
@router.get("/site", response_model=SiteSettingsOut)
def get_site(db: Session = Depends(get_db)):
    return SiteSettingsOut.model_validate(_get_or_create_site(db))


@router.put("/site", response_model=SiteSettingsOut)
def update_site(
    payload: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    _owner: models.User = Depends(require_owner),
):
    site = _get_or_create_site(db)
    data = payload.model_dump(exclude_unset=True)
    if data.get("site_title"):
        site.site_title = data["site_title"].strip()
    if data.get("tagline") is not None and data.get("tagline") != "":
        site.tagline = data["tagline"].strip()
    db.commit()
    db.refresh(site)
    return SiteSettingsOut.model_validate(site)


@router.post("/site/logo", response_model=SiteSettingsOut)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _owner: models.User = Depends(require_owner),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(status_code=400, detail="Logo must be a PNG, JPG, SVG, GIF or WebP image")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"logo-{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, filename)
    with open(dest, "wb") as out:
        out.write(await file.read())

    site = _get_or_create_site(db)
    site.logo_url = f"/api/uploads/{filename}"
    db.commit()
    db.refresh(site)
    return SiteSettingsOut.model_validate(site)
