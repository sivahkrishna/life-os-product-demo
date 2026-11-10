import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import models
from database import Base, engine
from routers import (
    analytics,
    auth as auth_router,
    calendar as calendar_router,
    finance,
    fitness,
    goals,
    habits,
    learning,
    projects,
    settings as settings_router,
    tasks,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Life OS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "life-os-api"}


app.include_router(auth_router.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(finance.router)
app.include_router(habits.router)
app.include_router(learning.router)
app.include_router(fitness.router)
app.include_router(calendar_router.router)
app.include_router(goals.router)
app.include_router(analytics.router)
app.include_router(settings_router.router)

app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
