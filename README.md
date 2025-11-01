# Hawker Opportunity Score Platform

This project proposes a data-driven web application that identifies promising locations to open new hawker centres in Singapore. It computes a Hawker-Opportunity Score for each subzone based on population demand, existing hawker supply, and accessibility. Users (urban planners, entrepreneurs, policymakers) can interact with a map to explore opportunity scores, view detailed breakdowns, and compare subzones.

## Project Structure

```
sc2006-proj/
├── backend/                              # FastAPI backend (Python)
│   ├── requirements.txt                  # Backend dependencies
│   ├── sql/
│   │   └── 001_init.sql                  # DB schema (snapshots, subzones, users, tokens)
│   └── src/
│       ├── main.py                       # Server entrypoint, CORS, router mounting
│       ├── db/
│       │   └── __init__.py               # SQLAlchemy engine + get_session()
│       ├── controllers/                  # Orchestrates use-cases across services/repos
│       │   ├── admin_controller.py       # Refresh/list/restore snapshots + export
│       │   ├── data_controller.py        # Assemble FeatureCollection, list subzones
│       │   └── auth_controller.py        # Register/login/refresh/logout/me
│       ├── repositories/                 # Data access layer (DB CRUD/queries)
│       │   ├── snapshot_repo.py
│       │   ├── subzone_repo.py
│       │   └── user_repo.py
│       ├── models/
│       │   ├── db_models.py              # SQLAlchemy models: Snapshot, Subzone, User, RefreshToken
│       │   └── kernel_config.py          # (existing)
│       ├── routers/                      # HTTP endpoints
│       │   ├── api_router.py             # Mounts all sub-routers with prefixes
│       │   ├── admin_router.py           # /admin/* (JWT admin only; data + users)
│       │   ├── data_router.py            # /data/* (file + DB endpoints)
│       │   ├── auth_router.py            # /auth/* (login/register/change-password/...)
│       │   ├── config_router.py          # /config/* (app config)
│       │   ├── export_router.py          # /export/* (optional)
│       │   ├── subzones_router.py        # /subzones/* (optional)
│       │   └── deps.py                   # FastAPI deps (DB session, JWT guards)
│       ├── schemas/                      # Pydantic request/response DTOs (expand as needed)
│       └── services/                     # Business logic
│           ├── snapshot_service.py       # Ingest/export snapshots
│           ├── auth_service.py           # Hash/verify, JWT, refresh tokens
│           └── scoring_service.py        # (optional) server-side compute
├── frontend/                             # React + Vite + TypeScript frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts                    # Dev server + proxy to backend (/data,/auth,/admin)
│   └── src/
│       ├── components/
│       │   └── Map/                      # MapView & layers (Subzones/Hawkers/MRT)
│       ├── contexts/
│       ├── screens/
│       │   ├── MainUI/                   # Map & exploration (Details, Search, Filter, Compare)
│       │   ├── Compare/                  # Side-by-side ComparisonPage
│       │   ├── Admin/                    # AdminPage (Data Management + User Management)
│       │   ├── Auth/                     # Login/Register
│       │   └── Profile/                  # ProfilePage (change password)
│       ├── services/                     # API client wrappers (data + admin)
│       └── utils/                        # Geo helpers, color scales
├── content/                              # Datasets & the exported GeoJSON used by the map
│   ├── HawkerCentresGEOJSON.geojson
│   ├── LTAMRTStationExitGEOJSON.geojson
│   ├── MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson
│   └── out/
│       └── hawker_opportunities_ver2.geojson   # “current” snapshot export
├── README.md
├── ScoreDemo.py                          # Scoring demo / notebook-style script
├── bootstrap.py                          # One-shot setup: create schema/seed, optional export
└── solve.py                              # Utility script(s)
```

### Folder roles
- **backend/src/db**: SQLAlchemy engine/session; `get_session()` dependency.
- **backend/src/models**: ORM models (`Snapshot`, `Subzone`, `User`, `RefreshToken`).
- **backend/src/repositories**: Pure DB access (CRUD/queries): snapshots, subzones, users.
- **backend/src/services**: Business logic (ingest/export, auth/JWT).
- **backend/src/controllers**: Use-case orchestration (snapshots, auth, data).
- **backend/src/routers**: HTTP endpoints; admin includes Data and User management; auth includes change password.
- **frontend/src/screens/MainUI**: Map experience (details, search, region and rank filters, compare tray).
- **frontend/src/screens/Admin**: Tabbed console with Data Management (upload GeoJSON, manage snapshots) and User Management (list/create admin/delete).
- **frontend/src/screens/Compare**: Side‑by‑side comparison (includes Z_Dem, Z_Sup, Z_Acc, H_score, population, transport, hawkers).
- **frontend/src/screens/Profile**: Profile and change password.
- **content/out**: Exported “current” GeoJSON; the map fetches this file.

## Functional Requirements (current)

### Display map
- 1.1 DisplaySubzones — Draw URA subzone polygons. Polygons are hoverable and clickable.
- 1.2 ChoroplethLayer — Shade subzones by Hawker-Opportunity Score with legend and normalized colour scale.
- 1.3 MapInteractionControls — Zoom, pan, and hover interactions on the subzone map.

### Display score and percentile
- 2.1 Hawker-OpportunityScore — Compute Dem, Sup, Acc, z-scale components, and produce Hᵢ with configurable weights and bandwidths.
- 2.2 ShowSubzoneRankPercentile — Show each selected subzone’s city-wide percentile for Hᵢ.

### Filtering and search
- 3.1 FilterByGeography — Filter visible subzones by region and optional subzone.
- 3.2 FilterByScoreQuantile — Filter by Top 10% / 25% / 50% or All; update legend accordingly.
- 3.3 SearchBySubzoneName — Autocomplete search; zoom and highlight on selection.

### Subzone details and comparison
- 4.1 ShowSubzoneDetails — For a selected subzone, display demographics, nearby hawker centres, nearby MRT/bus, Dem/Sup/Acc component values, final Hᵢ, and simple charts.
- 4.2 SubzoneComparison — Let users add up to two subzones to a tray and view side-by-side metrics with radar/table views. (a subpage in the main page map)
- 4.3 ExportSubzoneDetails — Export the current subzone details view as PDF/PNG with metadata.

### Admin data operations and user management
- 5.1 DataManagement — Upload FeatureCollection GeoJSON, ingest + recompute + export current snapshot.
- 5.2 ManageSnapshots — List, view, and restore snapshots with version notes and timestamps.
- 5.4 ManageUsers (Admin) — Dedicated tab in AdminPage for user management.

### Authentication and password flows
- 6.1 ClientRegistration — Register a client account.
- 6.2 UserLogin — Log in with email and password; idle session timeout enforced.
- 6.3 PasswordManagement — Change password while signed in (ProfilePage).
- 6.4 ResetForgottenPassword — (backlog) email flow with one-time token and policy checks.

## Tech Stack

**Frontend:**

- React.js
- TypeScript
- Tailwind CSS

**Backend:**

- FastAPI
- Python
- Postgres (Neon) — planned for Admin snapshots

## Run locally (step‑by‑step)

Prerequisites
- Python 3.11+ and Node 18+
- A Neon Postgres database (connection string)

1) Configure environment
- Create `.env` at repo root:
```
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@YOUR-NEON-HOST:5432/DBNAME?sslmode=require
JWT_SECRET=change-me-in-production
EXPORT_DIR=content/out
```

2) Bootstrap backend (install deps, create schema, optional seed)
```
run bootstrap.py

```

3) Start frontend
```
cd frontend
npm install
npm run dev
# Open http://127.0.0.1:5173
```

4) Admin workflow (UI)
- Open `http://127.0.0.1:5173/#/admin`.
- Login with the admin user.
- Paste a valid FeatureCollection JSON and click “Refresh Dataset”.
  - Backend ingests rows into Neon, marks the snapshot current, and exports `content/out/hawker_opportunities_ver2.geojson`.
- Use the Snapshots list to restore any snapshot.
- Click “Back to Map” to see the latest export on the map. The frontend fetches `/data/opportunity.geojson` with cache‑busting.

5) Useful API endpoints
- `/auth/login` (POST) — get access/refresh tokens
- `/admin/refresh` (POST, admin) — ingest FeatureCollection, set current, export file
- `/admin/snapshots` (GET, admin) — list snapshots
- `/admin/snapshots/{id}/restore` (POST, admin) — change current + export
- `/data/opportunity.geojson` (GET) — exported “current” FeatureCollection
- `/data/opportunity-db.geojson` (GET) — FeatureCollection assembled from DB

User management (admin-only)
- `/admin/users` (GET) — list users
- `/admin/users` (POST) — create admin user (email + password); persists to Neon DB
- `/admin/users/{id}` (DELETE) — delete a user
Auth
- `/auth/change-password` (POST) — change password for current user (auth required)

## Frontend routes and flows (current)

- `#/home` — HomePage: project overview and references (data sources, methodology). Buttons: Sign in → `#/login`, Register → `#/register`.
- `#/login` — LoginPage: shared for Admin and Client. After login: Admin → `#/admin`, Client → `#/map`.
- `#/register` — RegisterPage: client   registration. Creates a client account in Neon Postgres via `/auth/register`. On success, redirect to `#/login`.
- `#/map` — Map (MainPage/MapView).
- `#/admin` — AdminPage (guarded; non‑admin redirected to `#/login`).
- `#/compare` — ComparisonPage.
- `#/profile` — ProfilePage (change password).
- AdminPage contains two tabs: Data Management (GeoJSON refresh/snapshots) and User Management (list users, create admin, delete user).
- User Management reads from/writes to Neon DB (create/delete reflect immediately).



