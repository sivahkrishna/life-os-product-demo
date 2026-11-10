import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="USER", nullable=False)  # USER | OWNER
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SiteSettings(Base):
    __tablename__ = "site_settings"
    id = Column(Integer, primary_key=True, index=True)
    site_title = Column(String, default="Life OS")
    tagline = Column(String, default="Organize every part of your life, manually and mindfully.")
    logo_url = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


# ---- Tasks & Projects ----
class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="active")  # active | completed | archived
    color = Column(String, default="#4338CA")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="todo")  # todo | in_progress | done
    priority = Column(String, default="medium")  # low | medium | high
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    project = relationship("Project", back_populates="tasks")


# ---- Financial Management ----
class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    type = Column(String, default="checking")  # checking | savings | credit | cash | investment
    balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)  # income | expense
    date = Column(Date, nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String, nullable=False)
    monthly_limit = Column(Float, nullable=False)


# ---- Habit Tracking ----
class Habit(Base):
    __tablename__ = "habits"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    frequency = Column(String, default="daily")  # daily | weekly
    target_per_period = Column(Integer, default=1)
    color = Column(String, default="#0D9488")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")


class HabitLog(Base):
    __tablename__ = "habit_logs"
    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    completed = Column(Boolean, default=True)
    habit = relationship("Habit", back_populates="logs")


# ---- Learning & Career ----
class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    level = Column(Integer, default=1)  # 1-5


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    provider = Column(String, nullable=True)
    status = Column(String, default="in_progress")  # planned | in_progress | completed
    progress = Column(Integer, default=0)  # 0-100
    target_date = Column(Date, nullable=True)


class CareerMilestone(Base):
    __tablename__ = "career_milestones"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False)


# ---- Fitness & Wellness ----
class Workout(Base):
    __tablename__ = "workouts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    calories = Column(Integer, nullable=True)
    date = Column(Date, nullable=False)
    notes = Column(String, nullable=True)


class WellnessLog(Base):
    __tablename__ = "wellness_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    mood = Column(Integer, nullable=True)  # 1-5
    sleep_hours = Column(Float, nullable=True)
    water_glasses = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)


# ---- Calendar & Scheduling ----
class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)
    category = Column(String, default="general")


# ---- Personal Goals ----
class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    category = Column(String, default="personal")  # career | finance | health | learning | personal
    description = Column(Text, nullable=True)
    target_date = Column(Date, nullable=True)
    progress = Column(Integer, default=0)  # 0-100
    status = Column(String, default="active")  # active | completed | abandoned
