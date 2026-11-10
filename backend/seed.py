"""Seed script for Life OS.

Run from inside backend/:  python3 seed.py

Idempotent: it creates the schema, then only seeds when no User rows exist yet.
Everything is deterministic (random.seed(42)) and purely local — no external calls.
"""

import datetime
import random

import models
from auth import hash_password
from database import Base, SessionLocal, engine

random.seed(42)

TODAY = datetime.date.today()
NOW = datetime.datetime.utcnow()


def d(offset_days: int) -> datetime.date:
    return TODAY + datetime.timedelta(days=offset_days)


def dt(offset_days: int, hour: int, minute: int = 0) -> datetime.datetime:
    return datetime.datetime.combine(d(offset_days), datetime.time(hour, minute))


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            print("Users already exist — skipping seed.")
            return

        owner = models.User(
            email="owner@lifeos.app",
            name="Life OS Owner",
            password_hash=hash_password("Owner@123"),
            role="OWNER",
        )
        demo = models.User(
            email="demo@lifeos.app",
            name="Demo User",
            password_hash=hash_password("Demo@123"),
            role="USER",
        )
        db.add_all([owner, demo])
        db.commit()
        db.refresh(owner)
        db.refresh(demo)

        db.add(
            models.SiteSettings(
                site_title="Life OS",
                tagline="Organize every part of your life, manually and mindfully.",
            )
        )
        db.commit()

        # ---------------- Projects & tasks ----------------
        project_specs = [
            ("Website Redesign", "Rebuild the marketing site with a calmer layout system.", "#4338CA"),
            ("Home Office Setup", "Turn the spare room into a proper working space.", "#0D9488"),
            ("Q3 Health Reset", "Sleep, movement and food structure for the quarter.", "#D97706"),
        ]
        projects = []
        for name, desc, color in project_specs:
            p = models.Project(user_id=demo.id, name=name, description=desc, status="active", color=color)
            db.add(p)
            projects.append(p)
        db.commit()
        for p in projects:
            db.refresh(p)

        task_specs = [
            (0, "Audit current pages", "todo", "high", -6),
            (0, "Wireframe new homepage", "in_progress", "high", -2),
            (0, "Pick typography pairing", "done", "medium", -9),
            (0, "Write launch checklist", "todo", "low", 4),
            (1, "Measure the room", "done", "medium", -11),
            (1, "Order standing desk", "in_progress", "high", -1),
            (1, "Sort cable management", "todo", "low", 3),
            (2, "Book sleep study follow-up", "todo", "high", 1),
            (2, "Plan three weeknight meals", "in_progress", "medium", 2),
            (2, "Start 20-minute walks", "done", "medium", -5),
        ]
        for p_idx, title, status, priority, due_offset in task_specs:
            task = models.Task(
                user_id=demo.id,
                project_id=projects[p_idx].id,
                title=title,
                description=None,
                status=status,
                priority=priority,
                due_date=d(due_offset),
                created_at=datetime.datetime.combine(d(due_offset - 7), datetime.time(9, 0)),
            )
            if status == "done":
                task.completed_at = datetime.datetime.combine(d(due_offset + 1), datetime.time(17, 30))
            db.add(task)
        db.commit()

        # ---------------- Finance ----------------
        checking = models.Account(user_id=demo.id, name="Checking", type="checking", balance=2400.0)
        savings = models.Account(user_id=demo.id, name="Savings", type="savings", balance=8100.0)
        db.add_all([checking, savings])
        db.commit()
        db.refresh(checking)
        db.refresh(savings)

        tx_specs = [
            ("Salary", 3200.00, "income", -1, checking.id, "Monthly salary"),
            ("Salary", 3200.00, "income", -31, checking.id, "Monthly salary"),
            ("Salary", 3200.00, "income", -59, checking.id, "Monthly salary"),
            ("Rent", 1250.00, "expense", -30, checking.id, "Apartment rent"),
            ("Rent", 1250.00, "expense", -60, checking.id, "Apartment rent"),
            ("Rent", 1250.00, "expense", -2, checking.id, "Apartment rent"),
            ("Groceries", 96.40, "expense", -3, checking.id, "Weekly shop"),
            ("Groceries", 78.15, "expense", -10, checking.id, "Weekly shop"),
            ("Groceries", 112.30, "expense", -17, checking.id, "Weekly shop"),
            ("Groceries", 88.90, "expense", -24, checking.id, "Weekly shop"),
            ("Groceries", 101.25, "expense", -38, checking.id, "Weekly shop"),
            ("Transport", 42.00, "expense", -4, checking.id, "Fuel"),
            ("Transport", 38.50, "expense", -18, checking.id, "Metro card"),
            ("Transport", 55.00, "expense", -44, checking.id, "Fuel"),
            ("Entertainment", 29.99, "expense", -6, checking.id, "Streaming"),
            ("Entertainment", 64.00, "expense", -21, checking.id, "Cinema and dinner"),
            ("Entertainment", 24.00, "expense", -48, checking.id, "Concert ticket"),
            ("Utilities", 143.20, "expense", -8, checking.id, "Electricity"),
            ("Utilities", 62.00, "expense", -12, checking.id, "Internet"),
            ("Utilities", 138.75, "expense", -37, checking.id, "Electricity"),
            ("Utilities", 59.00, "expense", -52, checking.id, "Internet"),
            ("Transfer", 500.00, "income", -5, savings.id, "Monthly savings transfer"),
            ("Transfer", 500.00, "income", -35, savings.id, "Monthly savings transfer"),
            ("Hobbies", 46.80, "expense", -14, checking.id, "Pottery class"),
            ("Health", 35.00, "expense", -27, checking.id, "Pharmacy"),
        ]
        for category, amount, ttype, offset, account_id, note in tx_specs:
            db.add(
                models.Transaction(
                    user_id=demo.id,
                    account_id=account_id,
                    category=category,
                    amount=amount,
                    type=ttype,
                    date=d(offset),
                    note=note,
                )
            )
        db.add_all(
            [
                models.Budget(user_id=demo.id, category="Groceries", monthly_limit=450.0),
                models.Budget(user_id=demo.id, category="Entertainment", monthly_limit=120.0),
            ]
        )
        db.commit()

        # ---------------- Habits ----------------
        habit_specs = [
            ("Drink Water", "#0D9488", 0.80),
            ("Read", "#4338CA", 0.60),
            ("Exercise", "#16A34A", 0.50),
            ("Meditate", "#D97706", 0.70),
        ]
        for name, color, density in habit_specs:
            habit = models.Habit(
                user_id=demo.id,
                name=name,
                frequency="daily",
                target_per_period=1,
                color=color,
                created_at=datetime.datetime.combine(d(-32), datetime.time(8, 0)),
            )
            db.add(habit)
            db.flush()
            for i in range(30):
                if pow(random.uniform(0, 1), 1.6) < density:
                    db.add(
                        models.HabitLog(
                            habit_id=habit.id,
                            date=d(-i),
                            completed=True,
                        )
                    )
        db.commit()

        # ---------------- Learning & career ----------------
        db.add_all(
            [
                models.Skill(user_id=demo.id, name="Typography", category="Design", level=4),
                models.Skill(user_id=demo.id, name="Data Modelling", category="Engineering", level=3),
                models.Skill(user_id=demo.id, name="Public Speaking", category="Soft skills", level=2),
                models.Course(
                    user_id=demo.id,
                    title="Design Systems Fundamentals",
                    provider="Interaction Design Foundation",
                    status="in_progress",
                    progress=60,
                    target_date=d(45),
                ),
                models.Course(
                    user_id=demo.id,
                    title="Personal Finance Basics",
                    provider="Coursera",
                    status="completed",
                    progress=100,
                    target_date=d(-20),
                ),
                models.CareerMilestone(
                    user_id=demo.id,
                    title="Promoted to Senior Designer",
                    description="Led the design system rollout across three teams.",
                    date=d(-120),
                ),
                models.CareerMilestone(
                    user_id=demo.id,
                    title="Speak at local design meetup",
                    description="30-minute talk on practical design tokens.",
                    date=d(60),
                ),
            ]
        )
        db.commit()

        # ---------------- Fitness & wellness ----------------
        workout_specs = [
            ("Running", 32, 310, -1, "Easy 5k around the park"),
            ("Strength", 45, 280, -3, "Upper body circuit"),
            ("Yoga", 25, 120, -6, "Morning mobility flow"),
            ("Cycling", 50, 400, -9, "River loop"),
            ("Strength", 40, 265, -13, "Leg day"),
            ("Swimming", 30, 300, -18, "1000m freestyle"),
        ]
        for wtype, minutes, calories, offset, notes in workout_specs:
            db.add(
                models.Workout(
                    user_id=demo.id,
                    type=wtype,
                    duration_minutes=minutes,
                    calories=calories,
                    date=d(offset),
                    notes=notes,
                )
            )
        moods = [4, 3, 5, 3, 4, 4, 2, 5, 4, 3, 4, 5, 3, 4]
        sleeps = [7.2, 6.4, 8.0, 6.8, 7.5, 7.1, 5.9, 8.2, 7.0, 6.6, 7.8, 7.4, 6.9, 7.6]
        waters = [7, 6, 8, 5, 7, 8, 4, 9, 6, 5, 8, 7, 6, 8]
        for i in range(14):
            db.add(
                models.WellnessLog(
                    user_id=demo.id,
                    date=d(-i),
                    mood=moods[i],
                    sleep_hours=sleeps[i],
                    water_glasses=waters[i],
                    weight=round(74.5 - i * 0.05 + (random.uniform(-0.3, 0.3)), 1),
                )
            )
        db.commit()

        # ---------------- Calendar events ----------------
        event_specs = [
            ("Dentist appointment", -3, 9, 10, "Bright Smile Clinic", "health"),
            ("Design review", -1, 14, 15, "Studio room 2", "work"),
            ("Morning run with Arjun", 0, 7, 8, "Riverside trail", "fitness"),
            ("Groceries run", 1, 18, 19, "Corner market", "errand"),
            ("Project sync", 2, 11, 12, "Video call", "work"),
            ("Birthday dinner", 3, 20, 22, "Terrace restaurant", "personal"),
            ("Course webinar", 5, 16, 17, "Online", "learning"),
            ("Weekly review", 7, 17, 18, "Home desk", "personal"),
        ]
        for title, offset, start_h, end_h, location, category in event_specs:
            db.add(
                models.Event(
                    user_id=demo.id,
                    title=title,
                    description=None,
                    start_time=dt(offset, start_h),
                    end_time=dt(offset, end_h),
                    location=location,
                    category=category,
                )
            )
        db.commit()

        # ---------------- Goals ----------------
        goal_specs = [
            ("Ship the redesigned portfolio", "career", 65, "active", 30),
            ("Save a 3-month emergency fund", "finance", 45, "active", 120),
            ("Run a 10k without stopping", "health", 40, "active", 60),
            ("Finish the design systems course", "learning", 60, "active", 45),
            ("Read 12 books this year", "personal", 100, "completed", -10),
        ]
        for title, category, progress, status, offset in goal_specs:
            db.add(
                models.Goal(
                    user_id=demo.id,
                    title=title,
                    category=category,
                    description=None,
                    target_date=d(offset),
                    progress=progress,
                    status=status,
                )
            )
        db.commit()

        print("Seed complete.")
        print("Owner: owner@lifeos.app / Owner@123")
        print("Demo user: demo@lifeos.app / Demo@123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
