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
│       │   ├── admin_router.py           # /admin/* (JWT admin only)
│       │   ├── data_router.py            # /data/* (file + DB endpoints)
│       │   ├── auth_router.py            # /auth/* (login/register/...)
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
│       │   ├── MainUI/                   # Main map & exploration UI
│       │   ├── Compare/                  # Side-by-side ComparisonPage
│       │   └── Admin/                    # AdminPage (login, upload, snapshots)
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
└── solve.py                              # Utility script(s)
```

### Folder roles
- **backend/src/db**: Database engine/session creator; `get_session()` dependency.
- **backend/src/models**: SQLAlchemy models and any domain-specific config models.
- **backend/src/repositories**: Pure DB access (CRUD/queries), no HTTP or app logic.
- **backend/src/services**: Business logic (ingest/export, auth/JWT), reusable by controllers.
- **backend/src/controllers**: Orchestrates a use-case (start/commit, call services/repos, return DTOs).
- **backend/src/routers**: FastAPI HTTP endpoints; uses controllers and shared deps/guards.
- **frontend/src/screens/MainUI**: End‑user map experience (Details, Search, Filter, Compare).
- **frontend/src/screens/Admin**: Admin console for login, upload FeatureCollection, snapshot list/restore.
- **frontend/src/screens/Compare**: Side‑by‑side comparison view.
- **content/out**: Backend writes the exported “current” GeoJSON here; the map fetches this file.

## Functional Requirements

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

### Admin data operations and export
- 5.1 RefreshDatasets (Admin) — Reload official datasets and recompute scores; save a new snapshot.
- 5.2 ManageSnapshots (Admin) — List, view, and restore snapshots with version notes and timestamps.
- 5.3 ExportSubzoneDetails — Export the current subzone details view as PDF/PNG with metadata.

### Authentication and password flows
- 6.1 ClientRegistration — Register a client account.
- 6.2 UserLogin — Log in with email and password; idle session timeout enforced.
- 6.3 PasswordManagement — Change password while signed in; invalidate other sessions.
- 6.4 ResetForgottenPassword — “Forgot Password” email flow with one-time token and policy checks.

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

2) Install backend deps and apply schema
```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt

# Apply DB schema (no psql required)
python - << 'PY'
from pathlib import Path
from dotenv import load_dotenv; load_dotenv()
import os
from sqlalchemy import create_engine
sql = Path('backend/sql/001_init.sql').read_text()
engine = create_engine(os.environ['DATABASE_URL'], future=True)
with engine.begin() as c:
    c.exec_driver_sql(sql)
print('Schema applied')
PY
```

3) Create an initial admin user (one‑off)
```
python - << 'PY'
from backend.src.db import get_session
from backend.src.services.auth_service import hash_password
from backend.src.repositories.user_repo import create_user
with get_session() as s:
    uid = create_user(s, email='admin@example.com', password_hash=hash_password('pass123'), role='admin')
    print('admin user id:', uid)
PY
```

4) Start backend
```
uvicorn backend.src.main:app --host 127.0.0.1 --port 8000 --reload
# Health check
curl http://127.0.0.1:8000/healthz
```

5) Install frontend deps and run
```
cd frontend
npm install
npm run dev
# Open http://127.0.0.1:5173
```

6) Admin workflow (UI)
- Open `http://127.0.0.1:5173/#/admin`.
- Login with the admin user.
- Paste a valid FeatureCollection JSON and click “Refresh Dataset”.
  - Backend ingests rows into Neon, marks the snapshot current, and exports `content/out/hawker_opportunities_ver2.geojson`.
- Use the Snapshots list to restore any snapshot.
- Click “Back to Map” to see the latest export on the map. The frontend fetches `/data/opportunity.geojson` with cache‑busting.

7) Useful API endpoints
- `/auth/login` (POST) — get access/refresh tokens
- `/admin/refresh` (POST, admin) — ingest FeatureCollection, set current, export file
- `/admin/snapshots` (GET, admin) — list snapshots
- `/admin/snapshots/{id}/restore` (POST, admin) — change current + export
- `/data/opportunity.geojson` (GET) — exported “current” FeatureCollection
- `/data/opportunity-db.geojson` (GET) — FeatureCollection assembled from DB

