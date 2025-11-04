# Hawker Opportunity Score Platform

This project proposes a data-driven web application that identifies promising locations to open new hawker centres in Singapore. It computes a Hawker-Opportunity Score for each subzone based on population demand, existing hawker supply, and accessibility. Users (urban planners, entrepreneurs, policymakers) can interact with a map to explore opportunity scores, view detailed breakdowns, and compare subzones.

## Project Structure

```
sc2006-proj/
├── backend/                              # FastAPI backend (Python)
│   ├── requirements.txt                  # Backend dependencies
│   ├── sql/
│   │   ├── 001_init.sql                  # Core schema (snapshots, subzones, users, tokens)
│   │   ├── 002_google_auth.sql           # Google OAuth user mapping
│   │   ├── 003_register_fields.sql       # Profile fields (display name, industry, phone)
│   │   ├── 005_email_verification.sql    # Email verification tokens
│   │   └── 006_password_reset.sql        # Password reset tokens
│   └── src/
│       ├── main.py                       # Server entrypoint, CORS, router mounting
│       ├── db/
│       │   └── __init__.py               # SQLAlchemy engine + get_session()
│       ├── controllers/                  # Orchestrates use-cases across services/repos
│       │   ├── admin_controller.py
│       │   ├── auth_controller.py
│       │   └── data_controller.py
│       ├── repositories/                 # Data access layer (DB CRUD/queries)
│       │   ├── snapshot_repo.py
│       │   ├── subzone_repo.py
│       │   └── user_repo.py
│       ├── models/
│       │   ├── base.py                   # SQLAlchemy DeclarativeBase
│       │   ├── refresh_token.py
│       │   ├── snapshot.py
│       │   ├── subzone.py
│       │   └── user.py
│       ├── routers/                      # HTTP endpoints
│       │   ├── api_router.py             # Mounts all sub-routers with prefixes
│       │   ├── admin_router.py           # /admin/* (JWT admin only; data + users)
│       │   ├── auth_router.py            # /auth/* (login/register/profile/email workflows)
│       │   ├── data_router.py            # /data/* (secured GeoJSON + DB views)
│       │   ├── export_router.py          # /export/* (optional)
│       │   ├── subzones_router.py        # /subzones/* (optional)
│       │   └── deps.py                   # FastAPI deps (DB session, JWT guards)
│       ├── schemas/                      # Pydantic request/response DTOs
│       │   ├── auth_schemas.py
│       │   ├── export_schemas.py
│       │   └── subzone_schemas.py
│       └── services/                     # Business logic
│           ├── auth_service.py           # Hash/verify, JWT, password policy, refresh tokens
│           ├── data_service.py           # Data assembly helpers
│           ├── email_service.py          # SMTP email (verification + reset)
│           └── snapshot_service.py       # Ingest/export snapshots
├── frontend/                             # React + Vite + TypeScript frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts                    # Dev server + proxy to backend (/data,/auth,/admin)
│   ├── public/
│   │   └── icons/                        # Map legend + POI icons
│   │       ├── bus.svg
│   │       ├── hawker.svg
│   │       └── mrt-exit.svg
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── components/
│       │   └── Map/                      # Leaflet map and layers
│       │       ├── MapView.tsx
│       │       ├── ChoroplethLayer.tsx
│       │       ├── HawkerCentresLayer.tsx
│       │       ├── MrtExitsLayer.tsx
│       │       ├── BusStopsLayer.tsx
│       │       ├── HeatMapLayer.tsx
│       │       └── Toolbar.tsx
│       ├── contexts/
│       │   └── AppStateContext.tsx
│       ├── screens/
│       │   ├── Home/
│       │   │   └── HomePage.tsx          # Landing page & overview
│       │   ├── MainUI/
│       │   │   └── MainPage.tsx          # Map & exploration (details, filters, compare)
│       │   ├── Compare/
│       │   │   └── ComparisonPage.tsx    # Side-by-side comparison tray
│       │   ├── Admin/
│       │   │   └── AdminPage.tsx         # Data & user management console
│       │   ├── Profile/
│       │   │   └── ProfilePage.tsx       # Profile management & password change
│       │   └── Auth/
│       │       ├── LoginPage.tsx
│       │       ├── RegisterPage.tsx
│       │       ├── ForgotPasswordPage.tsx
│       │       ├── ResetPasswordPage.tsx
│       │       └── VerifyEmailPage.tsx
│       ├── services/
│       │   └── api.ts                    # API client wrappers (data + auth + admin)
│       └── utils/
│           ├── colorScale.ts
│           └── geo.ts
├── content/                              # Datasets & the exported GeoJSON used by the map
│   ├── MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson
│   ├── HawkerCentresGEOJSON.geojson
│   ├── LTAMRTStationExitGEOJSON.geojson
│   ├── bus_stops.geojson
│   ├── ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv
│   └── out/
│       └── hawker_opportunities_ver2.geojson   # “current” snapshot export
├── README.md
├── ScoreDemo.py                          # Scoring demo / notebook-style script
└── bootstrap.py                          # One-shot setup: create schema/seed, optional export
```

### Folder roles
- **backend/src/db**: SQLAlchemy engine/session helpers; `get_session()` dependency for FastAPI.
- **backend/src/models**: ORM models split by concern (users, tokens, snapshots, subzones).
- **backend/src/repositories**: Pure DB access (CRUD/queries) used by controllers/services.
- **backend/src/services**: Business logic (auth/JWT/password policy, email delivery, data assembly, snapshot ingest/export).
- **backend/src/controllers**: Orchestrate use-cases (auth flows, dataset refresh/export, GeoJSON assembly).
- **backend/src/routers**: HTTP endpoints; auth now covers registration, JWT, Google sign-in, email verification, password reset, and profile.
- **frontend/src/screens/MainUI**: Interactive map experience (details, search, filters, compare tray).
- **frontend/src/screens/Auth**: Login/register plus email verification, forgot/reset password workflows.
- **frontend/src/screens/Admin**: Tabbed console with Data Management (GeoJSON refresh/snapshots) and User Management (list/create/delete admin users).
- **frontend/src/screens/Compare**: Side-by-side comparison (Z_Dem, Z_Sup, Z_Acc, H_score, transport, hawkers).
- **frontend/src/screens/Profile**: Profile updates (name, industry, phone, picture, password change).
- **content/out**: Exported “current” GeoJSON; the frontend fetches this file (secured by JWT).

## Functional Requirements (current)

### Display map
- 1.1 DisplaySubzones — Draw URA subzone polygons. Polygons are hoverable and clickable.
- 1.2 ChoroplethLayer — Shade subzones by Hawker-Opportunity Score with legend and normalized colour scale.
- 1.3 MapInteractionControls — Zoom, pan, and hover interactions on the subzone map.

### Display score and percentile
- 2.1 Hawker-OpportunityScore — Compute Dem, Sup, Acc, z-scale components, and produce Hᵢ with configurable weights and bandwidths.
- 2.2 ShowSubzoneRank — Show each selected subzone’s city-wide percentile for Hᵢ.

### Filtering and search
- 3.1 FilterByRegion — Filter visible subzones by region. 
- 3.2 FilterByRank — Filter by Top 10% / 25% / 50% or All; update legend accordingly.
- 3.3 SearchBySubzoneName — Autocomplete search; zoom and highlight on selection.

### Subzone details and comparison
- 4.1 ShowSubzoneDetails — For a selected subzone, display demographics, nearby hawker centres, nearby MRT/bus, Dem/Sup/Acc component values, final Hᵢ, and simple charts.
- 4.2 SubzoneComparison — Let users add up to two subzones to a tray and view side-by-side metrics with radar/table views. (a subpage in the main page map)
- 4.3 ExportSubzoneDetails — Export subzone details as an Excel file.

### Admin data operations and user management
- 5.1 ManageData — Upload FeatureCollection GeoJSON, ingest + recompute + export current snapshot.
- 5.2 ManageSnapshots — List, view, and restore snapshots with version notes and timestamps.
- 5.4 ManageUsers — Dedicated tab in AdminPage for user management.

### Authentication & profile
- 6.1 ClientRegistration — Register (Full Name, Email, Password, Industry, optional Phone); verification email dispatched.
- 6.2 Google Sign-in — Frontend uses GIS; backend verifies ID token and issues JWTs.
- 6.3 UserLogin — Email/password login with email verification enforcement.
- 6.4 PasswordReset — Request + confirm password reset via emailed token.
- 6.5 Profile Management — Update name, industry, phone, picture URL; change password with policy enforcement.

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
APP_BASE_URL=http://127.0.0.1:5173
GOOGLE_CLIENT_ID=your-google-oauth-client-id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="Hawker Opportunity <your-email@example.com>"
TOKEN_TTL_EMAIL_VERIFY_HOURS=24
TOKEN_TTL_PW_RESET_HOURS=1
```

> Tip: SMTP settings are required for email verification and password reset flows. For local development you can point these to a test SMTP server such as Mailtrap.

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
- If using a freshly created email/password admin, complete the email verification flow before attempting to sign in.
- Paste a valid FeatureCollection JSON and click “Refresh Dataset”.
  - Backend ingests rows into Neon, marks the snapshot current, and exports `content/out/hawker_opportunities_ver2.geojson`.
- Use the Snapshots list to restore any snapshot.
- Click “Back to Map” to see the latest export on the map. The frontend fetches `/data/opportunity.geojson` with cache‑busting.

5) Useful API endpoints
- `/auth/register` (POST) — create user (email, password, display_name, industry, phone?)
- `/auth/login` (POST) — get access/refresh tokens
- `/auth/google` (POST) — exchange Google ID token for app tokens
- `/auth/me` (GET) — current user (id, email, role, display_name, industry, phone, picture_url)
- `/auth/profile` (GET/PUT) — read/update profile (display_name, industry, phone, picture_url, optional password change)
- `/auth/verify-email/confirm` (POST) — confirm email verification token
- `/auth/verify-email/resend` (POST) — resend verification email
- `/auth/password-reset/request` (POST) — request password reset email
- `/auth/password-reset/confirm` (POST) — reset password with token
- `/auth/google/client-id` (GET) — expose Google Client ID to the frontend
- `/admin/refresh` (POST, admin) — ingest FeatureCollection, set current, export file
- `/admin/snapshots` (GET, admin) — list snapshots
- `/admin/snapshots/{id}/restore` (POST, admin) — change current + export
- `/data/opportunity.geojson` (GET) — exported “current” FeatureCollection
- `/data/opportunity-db.geojson` (GET) — FeatureCollection assembled from DB

User management (admin-only)
- `/admin/users` (GET) — list users
- `/admin/users` (POST) — create admin user (email + password); persists to Neon DB
- `/admin/users/{id}` (DELETE) — delete a user


## Frontend routes and flows (current)

- `#/home` — HomePage: project overview and references (data sources, methodology). Buttons: Sign in → `#/login`, Register → `#/register`.
- `#/login` — LoginPage: shared for Admin and Client. After login: Admin → `#/admin`, Client → `#/map`.
- `#/register` — RegisterPage: client registration. Creates a client account via `/auth/register` then prompts to verify email.
- `#/verify-email` — VerifyEmailPage: confirm token or resend verification email.
- `#/forgot-password` — ForgotPasswordPage: request password reset email.
- `#/reset-password` — ResetPasswordPage: submit token + new password.
- `#/map` — Map (MainPage/MapView).
- `#/admin` — AdminPage (guarded; non‑admin redirected to `#/login`).
- `#/compare` — ComparisonPage.
- `#/profile` — ProfilePage (change password).
- AdminPage contains two tabs: Data Management (GeoJSON refresh/snapshots) and User Management (list users, create admin, delete user).
- User Management reads from/writes to Neon DB (create/delete reflect immediately).



