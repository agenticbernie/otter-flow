# Otter Flow — PRD

## Original Problem Statement
A full-stack web app for solo builders. Scaffold step + Auth/CRUD step:
authentication (sign up/in/out), persistent DB, core models (User, Project,
Session, Capsule), authenticated dashboard, Project create/list/detail, and
full Project CRUD (create, read/list, update, delete with confirmation) with
strict per-user data isolation.

## Architecture
- **Frontend**: React (CRA/craco), Tailwind + shadcn/ui, Clerk React SDK, next-themes (light/dark). Uses `REACT_APP_BACKEND_URL` for all API calls.
- **Auth**: Clerk (Google + GitHub + email sign-up/sign-in). Frontend uses Clerk hosted components; backend verifies Clerk session JWTs via JWKS (RS256, issuer check) and scopes all data by the Clerk `sub`.
- **Backend**: FastAPI, async SQLAlchemy 2.0, all routes under `/api`.
- **Database**: Supabase PostgreSQL (Transaction Pooler, port 6543), async `asyncpg`, schema managed by Alembic.

## User Personas
- Solo builder: creates projects, edits/deletes them, only ever sees own data.

## Core Requirements (static)
- Users authenticate via Clerk; only their own data is accessible.
- Projects persist across refresh/logout/login.
- Secrets stay server-side.

## Data Models
- **User**: id, clerk_id (unique, indexed), email, name, created_at.
- **Project**: id, owner_id (FK→users.clerk_id, indexed), name, description?, created_at, updated_at.
- **Session** (reserved, no workflow): id, project_id (FK), owner_id, created_at.
- **Capsule** (reserved, no workflow): id, project_id (FK), owner_id, created_at.

## Implemented (2026-08-29)
- Clerk auth wiring on frontend (ClerkProvider + themed appearance, sign-in page, UserButton sign-out).
- Backend Clerk JWT verification + User upsert (`auth.py`).
- Supabase Postgres integration (`database.py`, `models.py`, Alembic migration).
- Project CRUD endpoints (create/list/get/update/delete), all owner-scoped.
- Frontend: Dashboard (list + create dialog), Project detail (name+description, edit dialog, delete-with-confirmation), reserved Sessions/Capsules placeholders, light/dark toggle.
- Verified backend end-to-end (pytest): auth rejection, full CRUD, persistence, cross-user isolation — via dependency-override and via LIVE deployed API with real Clerk tokens (2/2 passing).

## Known Issues / To Verify Manually
- **Clerk frontend load**: in the automated headless browser the Clerk widget stayed on the loading spinner (likely third-party-cookie/handshake behavior in the proxied preview). Needs manual confirmation in a real browser (user is actively configuring Clerk providers).
- Interactive Clerk sign-in (OAuth/email link) cannot be automated; verified via backend token minting instead.

## Backlog (not in this step)
- P1: Session & Capsule workflows.
- P2: pagination on projects list; GitHub integration; analytics; notifications.

## Next Tasks
- Confirm Clerk UI sign-in works in a real browser end-to-end.
- Begin Session workflow when requested.
