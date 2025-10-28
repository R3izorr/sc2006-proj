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
│       ├── controllers/                  # Orchestration layer
│       │   ├── admin_controller.py       # refresh/list/restore snapshots
│       │   ├── data_controller.py        # assemble FeatureCollection, list subzones
│       │   └── auth_controller.py        # login/register/refresh/logout/me
│       ├── repositories/                 # DB access (CRUD/queries)
│       │   ├── snapshot_repo.py
│       │   └── subzone_repo.py
│       ├── models/                       # App/domain models (pydantic or sqlalchemy wrappers)
│       │   ├── db_models.py              # SQLAlchemy models: Snapshot, Subzone, User, RefreshToken
│       │   └── kernel_config.py          # existing
│       ├── routers/                      # FastAPI routes
│       │   ├── admin_router.py           # /admin/*
│       │   ├── data_router.py            # /data/*
│       │   └── auth_router.py            # /auth/*
│       ├── schemas/                      # Pydantic request/response DTOs
│       └── services/                     # Business logic
│           ├── snapshot_service.py       # ingest/export snapshot
│           ├── auth_service.py           # hash/verify, JWT, refresh tokens
│           └── scoring_service.py        # (optional) server-side compute
├── frontend/                             # React + Vite + TypeScript frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts                    # Dev server + proxy to backend
│   └── src/
│       ├── components/
│       │   └── Map/                      # MapView, layers (Choropleth, Hawkers, MRT exits)
│       ├── contexts/                     # App state context
│       ├── screens/
│       │   ├── MainUI/                   # Main end-user map & exploration UI
│       │   └── Compare/                  # ComparisonPage (side-by-side)
│       ├── services/                     # API client wrappers
│       └── utils/                        # Geo helpers, color scales
├── content/                              # Datasets used by backend
│   ├── HawkerCentresGEOJSON.geojson
│   ├── LTAMRTStationExitGEOJSON.geojson
│   ├── MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson
│   └── out/
│       └── hawker_opportunities_ver2.geojson
├── README.md
├── ScoreDemo.py                          # Scoring demo / notebook-style script
└── solve.py                              # Utility script(s)
```

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

## Implementation plan (short, debuggable steps)

### Phase 0 — Env & DB
- [ ] Add `.env` with `DATABASE_URL` and `EXPORT_DIR`
- [ ] Create `backend/src/db/__init__.py` (engine/session, `get_session()`)
- [ ] Add `backend/sql/001_init.sql` (tables: `snapshots`, `subzones`)

### Phase 1 — Models/Repos
- [ ] `backend/src/models/db_models.py`: SQLAlchemy `Snapshot`, `Subzone`, `User`, `RefreshToken`
- [ ] `backend/src/repositories/snapshot_repo.py`:
  - `create_snapshot(note, by)` → id
  - `set_current_snapshot(id)` / `get_current_snapshot_id()`
  - `list_snapshots()` / `restore_snapshot(id)`
- [ ] `backend/src/repositories/subzone_repo.py`:
  - `insert_many(subzones, snapshot_id)`
  - `select_features_fc(snapshot_id)` (assemble rows → features)
  - `select_subzones(snapshot_id, filters)`

### Phase 2 — Services (data + auth)
- [ ] `backend/src/services/snapshot_service.py`:
  - `bulk_ingest_geojson(gj, snapshot_id)`
  - `export_current_geojson(snapshot_id, path)`
- [ ] `backend/src/services/auth_service.py`:
  - Password hashing (argon2/bcrypt), verify
  - Issue/verify JWT access tokens
  - Create/rotate/revoke refresh tokens (store hashed)
- [ ] (Optional) `backend/src/services/scoring_service.py` for server-side compute

### Phase 3 — Controllers
- [ ] `backend/src/controllers/admin_controller.py`:
  - `refresh_snapshot(note, file|raw)` → create → ingest → set current → export
  - `list_snapshots()`
  - `restore_snapshot(id)` → set current → export
- [ ] `backend/src/controllers/data_controller.py`:
  - `get_opportunity_geojson(current|id)` (DB → FeatureCollection)
  - `list_subzones(filters)`
- [ ] `backend/src/controllers/auth_controller.py`:
  - `register` (admin only)
  - `login` (issue access + refresh)
  - `refresh` (rotate refresh, new access)
  - `logout` (revoke refresh)
  - `me`

### Phase 4 — Routers
- [ ] `backend/src/routers/admin_router.py`:
  - `POST /admin/refresh` (multipart file optional)
  - `GET /admin/snapshots`
  - `POST /admin/restore/{id}`
- [ ] Update `backend/src/routers/data_router.py` to call controller (or keep exporting file path)
- [ ] `backend/src/routers/auth_router.py`: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/register`, `GET /auth/me`

### Phase 5 — Wiring & Guards
- [ ] Update `backend/src/main.py` to load `.env`, init DB, include routers
- [ ] Add auth dependency (JWT) and protect admin routes
- [ ] Verify `GET /data/opportunity.geojson` returns current snapshot (from DB or exported file)

### Phase 6 — Admin UX (optional, minimal)
- [ ] Login form; store access token (httpOnly cookie or memory)
- [ ] Simple admin page: upload GeoJSON, list/restore snapshots
- [ ] After refresh/restore: re-fetch map data (cache-bust already added)

### Test checklist
- [ ] Login works; protected routes require JWT
- [ ] Upload GeoJSON → snapshot created, current set, file exported
- [ ] Map loads new data at `/data/opportunity.geojson`
- [ ] List snapshots returns history; restore switches current and re-exports
- [ ] Filters/search still work

