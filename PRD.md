# Life OS — Product Requirements Document

## Vision
Life OS is a conventional, manual personal life-management web application — a
productivity and organization SaaS in the vein of Notion/Todoist/YNAB, scoped to
one person's own data. There is no AI assistant, no chatbot, no AI-generated
content, and no automated agent anywhere in the product. Every number the app
shows (streaks, balances, completion rates, trends) is computed with plain
arithmetic/SQL aggregation over rows the user themselves entered.

## Non-goals (explicit)
- No AI chat, AI agent, AI website/app generation, or AI content generation.
- No third-party LLM calls of any kind.
- No automation that acts on the user's behalf — the user enters and updates
  everything manually; the app only stores, computes, and displays.

## Users
- **USER** — a normal signed-up person managing their own data. Full CRUD over
  their own records only (every query is scoped to `user_id`).
- **OWNER** — the single site operator. Everything a USER has, plus
  Admin → Settings to edit the site title/tagline/logo shown across the app.

## Modules
1. **Tasks & Projects** — projects group tasks; tasks have status, priority, due date.
2. **Financial Management** — accounts, transactions (income/expense by category), budgets.
3. **Habit Tracking** — habits with daily/weekly logs; streak + completion-rate math.
4. **Learning & Career** — skills, courses/learning goals, career milestones.
5. **Fitness & Wellness** — workouts, and daily wellness logs (mood, sleep, water, weight).
6. **Calendar & Scheduling** — events with start/end, location, category.
7. **Personal Goals** — cross-cutting goals with category, target date, progress.
8. **Analytics** — a dashboard overview aggregating all of the above with plain
   calculations (no AI): completion rates, streaks, net cashflow, trends.

## Pages
- Public: Landing (marketing/overview), Login, Register.
- App (authenticated, persistent sidebar shell): Dashboard (bento overview),
  Projects, Tasks, Finance, Habits, Learning & Career, Fitness & Wellness,
  Calendar, Goals, Settings (profile + password).
- Owner-only: Admin → Settings (site title, tagline, logo).

## Tech stack
- Frontend: React + Vite + TypeScript + React Router + Tailwind, axios for /api.
- Backend: FastAPI + SQLAlchemy + PostgreSQL (`DATABASE_URL`), JWT auth
  (pbkdf2_sha256 hashing, string `sub`), python-jose.
- Deploy shape: frontend at root on :3000, backend in `backend/` on :8000,
  mounted at `/api` via `aindriya.json`. Uploaded logo files persist under
  `backend/uploads` (declared as a persistent path).

## Seed / demo accounts (created by backend/seed.py)
- Owner: `owner@lifeos.app` / `Owner@123`
- Demo user: `demo@lifeos.app` / `Demo@123` (seeded with realistic sample data
  across every module so the dashboard and every page render populated on first look)

## Design
See `design_guidelines.json` — Bento Grid archetype adapted with an indigo/teal
palette, Outfit (display) + Inter (body), 8pt spacing, rounded modular cards.
