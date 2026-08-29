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
- **Session**: id, project_id (FK), owner_id, status (active/ended), started_at, ended_at?, created_at.
- **Capsule**: id, project_id (FK), owner_id, session_id?, next_action, workspace_pointer?, done_when?, estimated_minutes?, status (pending/consumed), consumed_at?, consumed_by_session_id?, created_at.

## Implemented (2026-08-29)
- Clerk auth wiring on frontend (ClerkProvider + themed appearance, sign-in page, UserButton sign-out).
- Backend Clerk JWT verification + User upsert (`auth.py`).
- Supabase Postgres integration (`database.py`, `models.py`, Alembic migrations).
- Project CRUD endpoints (create/list/get/update/delete), all owner-scoped.
- Frontend: Dashboard (list + create dialog), Project detail (name+description, edit dialog, delete-with-confirmation), light/dark toggle.
- **Session/Capsule core loop**: start/end session, required next-action capsule on end, session-state endpoint (refresh-safe), Start Now (consumes capsule + new session), single-active-session enforcement (409), full ownership isolation. Frontend `SessionLoop` component shows active timer / pending capsule / idle-start, rendered above project content.
- Verified backend end-to-end (pytest, 3/3 passing): auth rejection, full CRUD, the complete loop, persistence, and cross-user isolation — via dependency-override and LIVE deployed API with real Clerk tokens.

## MVP Final Pass (2026-08-29)
- **GitHub App (server-side, user-token flow)**: connect-url → install URL with CSRF state; `/api/github/callback` exchanges code (state-validated), stores encrypted tokens server-side; status; repos (lists only granted repos via `/user/installations` → `/user/installations/{id}/repositories`); disconnect (revokes grant + deletes record). No private key, no source-code access. Tokens encrypted (Fernet), never sent to the browser.
- **Repo linking**: `POST /api/projects/{id}/link-repo` (from granted list or **manual GitHub URL fallback**), stores only id/owner/name/url; `DELETE .../repo` unlinks. Frontend `RepositorySection`.
- **Telemetry**: `POST /api/events` for the 5 allowed types (project_opened, session_started, session_ended, capsule_created, start_clicked), timestamped; unknown types rejected. Fired from the frontend loop.
- **Privacy/controls**: disconnect GitHub; delete Project cascades sessions/capsules (FK) + events (explicit); ownership isolation enforced everywhere; public **Privacy / Terms / Security** pages stating Otter does not sell data, train AI on project data, or store repo source code.
- Verified backend end-to-end (pytest, 4/4 suites, live API + Supabase + real Clerk tokens): auth, CRUD, golden loop, GitHub server-side branches, callback CSRF, telemetry, isolation, deletion cascade.

## Known Issues / To Verify Manually
- **Clerk frontend load**: in the automated headless browser the Clerk widget stayed on the loading spinner (likely third-party-cookie/handshake behavior in the proxied preview). Needs manual confirmation in a real browser (user is actively configuring Clerk providers).
- Interactive Clerk sign-in (OAuth/email link) cannot be automated; verified via backend token minting instead.

## Backlog (not in this step)
- P1: Session & Capsule workflows.
- P2: pagination on projects list; GitHub integration; analytics; notifications.

## Next Tasks
- Confirm Clerk UI sign-in works in a real browser end-to-end.
- Begin Session workflow when requested.
