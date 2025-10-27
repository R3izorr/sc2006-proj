from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONTENT_DIR = BASE_DIR / "content"
OUT_PATH = CONTENT_DIR / "out" / "hawker_opportunities_ver2.geojson"

app = FastAPI(title="Hawker Opportunity API")

# CORS (dev): allow Vite default ports explicitly
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_origin_regex=r"^http://(127\.0\.0\.1|localhost):\d+$",
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

# Optional: mount built frontend if you choose to build into backend/static later
STATIC_DIR = BASE_DIR / "backend" / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

@app.get("/")
def root():
    # Redirect to frontend dev or static root
    if STATIC_DIR.exists():
        return RedirectResponse(url="/index.html")
    return {"ok": True, "message": "Backend running"}

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.get("/data/opportunity.geojson")
def get_geojson():
    if not OUT_PATH.exists():
        raise HTTPException(status_code=404, detail="GeoJSON not found in content/out/")
    return FileResponse(str(OUT_PATH), media_type="application/geo+json")

# Routers
from .routers.api_router import api_router  # noqa: E402
app.include_router(api_router)


