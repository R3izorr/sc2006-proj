# Hawker Opportunity Score Platform

This project proposes a data-driven web application that identifies promising locations to open new hawker centres in Singapore. It computes a Hawker-Opportunity Score for each subzone based on population demand, existing hawker supply, and accessibility. Users (urban planners, entrepreneurs, policymakers) can interact with a map to explore opportunity scores, view detailed breakdowns, and compare subzones.

## Key Features

✨ **Interactive Map** — Explore 332 Singapore subzones with color-coded opportunity scores, hover details, and clickable polygons

📊 **Smart Ranking System** — Data-driven H-Score based on Demographics (Dem), Supply (Sup), and Accessibility (Acc) components

🤖 **AI Assistant** — Local LLM-powered chatbot (Llama 3.1 8B) with smart context injection for accurate, data-grounded responses about subzone rankings and platform features

🔍 **Advanced Filtering** — Search by name, filter by region, rank (Top 10/20/50), and export detailed reports

👥 **User Management** — Secure authentication with Google OAuth, email verification, password reset, and role-based access control

⚡ **Admin Dashboard** — Data refresh, snapshot management, and user administration with full CRUD operations

📈 **Comparison Tools** — Side-by-side subzone analysis with radar charts, tables, and component breakdowns

## Project Structure

```
sc2006-proj/
├── backend/                              # FastAPI backend (Python)
│   ├── requirements.txt                  # Backend dependencies (includes httpx for Ollama)
│   ├── sql/
│   │   └── schema.sql                    # Complete database schema (users, tokens, snapshots, subzones)
│   └── src/
│       ├── main.py                       # Server entrypoint, CORS, router mounting
│       ├── db/
│       │   └── __init__.py               # SQLAlchemy engine + get_session()
│       ├── controllers/                  # Orchestrates use-cases across services/repos
│       │   ├── admin_controller.py       # Admin operations (data refresh, user management)
│       │   ├── auth_controller.py        # Auth flows (register, login, profile, email verification)
│       │   ├── chat_controller.py        # AI chat orchestration with context injection
│       │   └── data_controller.py        # Data assembly and GeoJSON serving
│       ├── repositories/                 # Data access layer (DB CRUD/queries)
│       │   ├── snapshot_repo.py          # Snapshot database operations
│       │   ├── subzone_repo.py           # Subzone database operations
│       │   └── user_repo.py              # User database operations
│       ├── models/                       # SQLAlchemy ORM models
│       │   ├── base.py                   # SQLAlchemy DeclarativeBase
│       │   ├── refresh_token.py          # Refresh token model
│       │   ├── snapshot.py               # Snapshot model
│       │   ├── subzone.py                # Subzone model
│       │   └── user.py                   # User model (with email verification & password reset)
│       ├── routers/                      # HTTP endpoints
│       │   ├── api_router.py             # Mounts all sub-routers with prefixes
│       │   ├── admin_router.py           # /admin/* (JWT admin only; data + user management)
│       │   ├── auth_router.py            # /auth/* (login/register/profile/email workflows)
│       │   ├── chat_router.py            # /chat/* (AI assistant with streaming support)
│       │   ├── data_router.py            # /data/* (secured GeoJSON endpoints)
│       │   ├── export_router.py          # /export/* (data export endpoints)
│       │   ├── subzones_router.py        # /subzones/* (subzone queries)
│       │   └── deps.py                   # FastAPI deps (DB session, JWT guards)
│       ├── schemas/                      # Pydantic request/response DTOs
│       │   ├── auth_schemas.py           # Auth-related schemas
│       │   ├── chat_schemas.py           # Chat request/response schemas
│       │   ├── export_schemas.py         # Export-related schemas
│       │   └── subzone_schemas.py        # Subzone-related schemas
│       └── services/                     # Business logic
│           ├── auth_service.py           # Hash/verify, JWT, password policy, refresh tokens
│           ├── chat_service.py           # Ollama LLM integration with smart context detection
│           ├── data_service.py           # Data assembly helpers
│           ├── email_service.py          # SMTP email (verification + reset)
│           └── snapshot_service.py       # Ingest/export snapshots
├── frontend/                             # React + Vite + TypeScript frontend
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.cjs                # PostCSS configuration
│   ├── tailwind.config.cjs               # Tailwind CSS configuration
│   ├── tsconfig.json                     # TypeScript configuration
│   ├── vite.config.ts                    # Dev server + proxy to backend
│   ├── public/
│   │   ├── icons/                        # UI icons
│   │   │   ├── bus.svg
│   │   │   ├── hawker.svg
│   │   │   ├── mrt-exit.svg
│   │   │   ├── admin_icon.png
│   │   │   ├── details_icon.png
│   │   │   ├── filter_icon.png
│   │   │   ├── logout_icon.png
│   │   │   ├── profile_icon.png
│   │   │   ├── search_icon.png
│   │   │   └── settings_icon.png
│   │   └── images/                       # UI images & backgrounds
│   │       ├── hawker-logo.png
│   │       ├── HomePageBG.jpg
│   │       └── login-bg-unsplash.jpg
│   └── src/
│       ├── App.tsx                       # Main app with routing & auth guards
│       ├── main.tsx                      # Entry point
│       ├── index.css                     # Global styles
│       ├── components/
│       │   ├── Chat/                     # AI chatbot components
│       │   │   ├── ChatBox.tsx           # Chat UI with streaming responses
│       │   │   └── ChatButton.tsx        # Floating chat button
│       │   └── Map/                      # Leaflet map and layers
│       │       ├── MapView.tsx           # Main map component
│       │       ├── ChoroplethLayer.tsx   # Subzone polygons with color coding
│       │       ├── HawkerCentresLayer.tsx  # Hawker centre markers
│       │       ├── MrtExitsLayer.tsx     # MRT exit markers
│       │       ├── BusStopsLayer.tsx     # Bus stop markers
│       │       └── HeatMapLayer.tsx      # Heat map visualization
│       ├── contexts/
│       │   └── AppStateContext.tsx       # Global state (selected subzone, compare list)
│       ├── screens/
│       │   ├── Home/
│       │   │   └── HomePage.tsx          # Landing page & overview
│       │   ├── MainUI/
│       │   │   └── MainPage.tsx          # Map & exploration (requires auth) with AI chat
│       │   ├── Compare/
│       │   │   └── ComparisonPage.tsx    # Side-by-side comparison (requires auth)
│       │   ├── Admin/
│       │   │   └── AdminPage.tsx         # Data & user management (requires admin role)
│       │   ├── Profile/
│       │   │   └── ProfilePage.tsx       # Profile management (requires auth)
│       │   └── Auth/
│       │       ├── LoginPage.tsx         # User login
│       │       ├── RegisterPage.tsx      # User registration
│       │       ├── ForgotPasswordPage.tsx  # Password reset request
│       │       ├── ResetPasswordPage.tsx   # Password reset confirmation
│       │       └── VerifyEmailPage.tsx     # Email verification
│       ├── services/
│       │   ├── api.ts                    # API client wrappers (data + auth + admin)
│       │   └── chatApi.ts                # Chat API client with streaming support
│       ├── theme/
│       │   └── heroStyles.ts             # Hero section styling utilities
│       └── utils/
│           ├── colorScale.ts             # Color scale calculations
│           └── geo.ts                    # Geographic utilities
├── content/                              # Datasets & the exported GeoJSON used by the map
│   ├── MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson
│   ├── HawkerCentresGEOJSON.geojson
│   ├── LTAMRTStationExitGEOJSON.geojson
│   ├── bus_stops.geojson
│   ├── ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv
│   └── out/
│       └── hawker_opportunities_ver2.geojson   # "current" snapshot export
├── README.md
├── ScoreDemo.py                          # Scoring demo / notebook-style script
└── bootstrap.py                          # One-shot setup: create schema/seed, optional export
```

### Folder roles
- **backend/src/db**: SQLAlchemy engine/session helpers; `get_session()` dependency for FastAPI.
- **backend/src/models**: ORM models split by concern (users, tokens, snapshots, subzones).
- **backend/src/repositories**: Pure DB access (CRUD/queries) used by controllers/services.
- **backend/src/services**: Business logic (auth/JWT/password policy, email delivery, data assembly, snapshot ingest/export, Ollama LLM integration).
- **backend/src/controllers**: Orchestrate use-cases (auth flows, dataset refresh/export, GeoJSON assembly, AI chat with context injection).
- **backend/src/routers**: HTTP endpoints; auth now covers registration, JWT, Google sign-in, email verification, password reset, and profile. Chat endpoints support streaming responses.
- **frontend/src/components/Chat**: AI chatbot UI (floating button, chat window with streaming).
- **frontend/src/screens/MainUI**: Interactive map experience (details, search, filters, compare tray) with integrated AI assistant.
- **frontend/src/screens/Auth**: Login/register plus email verification, forgot/reset password workflows.
- **frontend/src/screens/Admin**: Tabbed console with Data Management (GeoJSON refresh/snapshots) and User Management (list/create/delete admin users).
- **frontend/src/screens/Compare**: Side-by-side comparison (Z_Dem, Z_Sup, Z_Acc, H_score, transport, hawkers).
- **frontend/src/screens/Profile**: Profile updates (name, industry, phone, picture, password change).
- **content/out**: Exported "current" GeoJSON; the frontend fetches this file (secured by JWT).

## Functional Requirements (current)

### Display map
- 1.1 DisplaySubzones — Draw URA subzone polygons. Polygons are hoverable and clickable.
- 1.2 ChoroplethLayer — Shade subzones by Hawker-Opportunity Score with legend and normalized colour scale.
- 1.3 MapInteractionControls — Zoom, pan, and hover interactions on the subzone map.

### Display score and rank
- 2.1 Hawker-OpportunityScore — Compute Dem, Sup, Acc, z-scale components, and produce Hᵢ with configurable weights and bandwidths.
- 2.2 ShowSubzoneRank — Show each selected subzone’s city-wide rank for Hᵢ.

### Filtering and search
- 3.1 FilterByRegion — Filter visible subzones by region. 
- 3.2 FilterByRank — Filter by Top 10 / 25 / 50 or All; update legend accordingly.
- 3.3 SearchBySubzoneName — Autocomplete search; zoom and highlight on selection.

### Subzone details and comparison
- 4.1 ShowSubzoneDetails — For a selected subzone, display demographics, nearby hawker centres, nearby MRT/bus, Dem/Sup/Acc component values, final Hᵢ, and simple charts.
- 4.2 SubzoneComparison — Let users add up to two subzones to a tray and view side-by-side metrics with radar/table views. (a subpage in the main page map)
- 4.3 ExportSubzoneDetails — Export subzone details as an Excel file.

### Admin data operations and user management
- 5.1 ManageData — Upload FeatureCollection GeoJSON, ingest + recompute + export current snapshot.
- 5.2 ManageSnapshots — List, view, and restore snapshots with version notes and timestamps.
- 5.3 ManageUsers — Dedicated tab in AdminPage for user management.

### Authentication & profile
- 6.1 ClientRegistration — Register (Full Name, Email, Password, Industry, optional Phone); verification email dispatched.
- 6.2 Google Sign-in — Frontend uses GIS; backend verifies ID token and issues JWTs.
- 6.3 UserLogin — Email/password login with email verification enforcement.
- 6.4 PasswordReset — Request + confirm password reset via emailed token.
- 6.5 Profile Management — Update name, industry, phone, picture URL; change password with policy enforcement.

### AI Assistant
- 7.1 AIChat — Local LLM-powered chatbot integrated into the map interface 

## Tech Stack
**Frontend:**
- React.js
- TypeScript
- Tailwind CSS
- Leaflet (map rendering)

**Backend:**
- FastAPI
- Python
- PostgreSQL (Neon) — user management, snapshots, subzone data
- Ollama — local LLM inference (llama3.1:8b recommended for 8GB VRAM)

**AI/ML:**
- Ollama (local LLM server)
- Llama 3.1 8B model (default)
- Smart context injection for data-grounded responses

## Run locally (step‑by‑step)

### Prerequisites
- Python 3.11+ and Node 18+
- A Neon Postgres database (connection string)
- **Ollama** installed ([https://ollama.com/download](https://ollama.com/download))
- **Llama 3.1 8B model** (recommended for systems with 8GB+ VRAM)

### Setup Steps

**1) Install and configure Ollama**

```bash
# Install Ollama from https://ollama.com/download
ollama pull gpt-oss:20b

# Start Ollama (it runs as a background service)
# Windows: Already running after installation
# Linux/Mac: ollama serve
```

**2) Configure environment**

Create `.env` at repo root:
```env
# Database
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@YOUR-NEON-HOST:5432/DBNAME?sslmode=require

# JWT & Export
JWT_SECRET=change-me-in-production
EXPORT_DIR=content/out
APP_BASE_URL=http://127.0.0.1:5173

# OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="Hawker Opportunity <your-email@example.com>"
TOKEN_TTL_EMAIL_VERIFY_HOURS=24
TOKEN_TTL_PW_RESET_HOURS=1

# AI Chat (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

> **Tips:** 
> - SMTP settings are required for email verification and password reset flows. For local development you can use Mailtrap.
> - Ollama runs on port 11434 by default. The backend will connect to it automatically.
> - You can use other Ollama models by changing `OLLAMA_MODEL` (e.g., `mistral:7b`, `qwen2.5:14b`)

**3) Bootstrap backend (install deps, create schema, optional seed)**
```bash
python bootstrap.py
```

**4) Start frontend**
```bash
cd frontend
npm install
npm run dev
# Open http://127.0.0.1:5173
```

**5) Using the AI Assistant**

Once logged in, you'll see a purple chat button on the map page (above the heat map toggle). Click it to:
- Ask about the platform features and methodology
- Query subzone rankings: *"Give me the rank 1 subzone"*
- Get top subzones: *"Show me the top 10 best locations"*
- Learn about specific areas: *"Tell me about rank #5"*

The AI automatically fetches real data from the database and provides accurate, context-aware responses.

**6) Admin workflow (UI)
- Open `http://127.0.0.1:5173/#/admin`.
- Login with the admin user.
- If using a freshly created email/password admin, complete the email verification flow before attempting to sign in.
- Paste a valid FeatureCollection JSON and click “Refresh Dataset”.
  - Backend ingests rows into Neon, marks the snapshot current, and exports `content/out/hawker_opportunities_ver2.geojson`.
- Use the Snapshots list to restore any snapshot.
- Click “Back to Map” to see the latest export on the map. The frontend fetches `/data/opportunity.geojson` with cache‑busting.

**7) Useful API endpoints**

**Authentication:**
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

**AI Chat (requires authentication):**
- `/chat/` (POST) — send chat message; supports streaming responses (SSE format)
- `/chat/health` (GET) — check if chat service is available
- `/chat/subzone-insight` (POST) — get AI-generated insight for a specific subzone

**Data:**
- `/data/opportunity.geojson` (GET) — exported "current" FeatureCollection
- `/data/opportunity-db.geojson` (GET) — FeatureCollection assembled from DB

**Admin (requires admin role):**
- `/admin/refresh` (POST) — ingest FeatureCollection, set current, export file
- `/admin/snapshots` (GET) — list snapshots
- `/admin/snapshots/{id}/restore` (POST) — change current + export

**User management (admin-only):**
- `/admin/users` (GET) — list users
- `/admin/users` (POST) — create admin user (email + password); persists to Neon DB
- `/admin/users/{id}` (DELETE) — delete a user


## Frontend routes and flows (current)

### Public Routes (No Authentication Required)
- `#/home` — HomePage: project overview and references (data sources, methodology). Buttons: Sign in → `#/login`, Register → `#/register`.
- `#/login` — LoginPage: shared for Admin and Client. After login: Admin → `#/admin`, Client → `#/map`. If already logged in, redirects automatically.
- `#/register` — RegisterPage: client registration. Creates a client account via `/auth/register` then prompts to verify email.
- `#/verify-email` — VerifyEmailPage: confirm token or resend verification email.
- `#/forgot-password` — ForgotPasswordPage: request password reset email.
- `#/reset-password` — ResetPasswordPage: submit token + new password.

### Protected Routes (Authentication Required)
- `#/map` — MainPage/MapView: Interactive map experience (details, search, filters, compare tray) with integrated AI assistant. **Requires login**.
  - **AI Chat**: Purple floating button opens an AI-powered chatbot that answers questions about the platform, provides subzone rankings, and explains methodology using real database context.
- `#/compare` — ComparisonPage: Side-by-side comparison of subzones. **Requires login**.
- `#/profile` — ProfilePage: Profile management and password change. **Requires login**.
- `#/admin` — AdminPage: Data & user management console. **Requires login + admin role**. Non-admin users are redirected to `#/login`.
  - Data Management tab: GeoJSON refresh/snapshots
  - User Management tab: list users, create admin, delete user (reads/writes to Neon DB)

## Troubleshooting

### Permission denied error on macOS/Linux

If you encounter a "permission denied" error when running `npm run dev` on macOS or Linux (e.g., `EACCES: permission denied, open '/path/to/node_modules/.bin/vite'`), this is due to missing execute permissions on the binary files.

**Quick fix:**
```bash
cd frontend
chmod +x node_modules/.bin/*
npm run dev
```

**Alternative (clean reinstall):**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

This issue occurs because Git doesn't preserve Unix file permissions when files are committed from Windows. The `npm install` should normally set these permissions, but sometimes they need to be manually fixed.



