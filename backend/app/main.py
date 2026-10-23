"""
TheSaviour - Real-time Civic Aid Coordination and Zero-Waste Redistribution Platform.
FastAPI Application Entry Point (Phase 1 Prototype).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, dashboard, donations, riders, shelters, compatibility, allocations

app = FastAPI(
    title="TheSaviour API",
    description="Real-time civic aid coordination, dynamic parcel splitting, and zero-waste logistics redistribution.",
    version="3.0.0-phase3",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",  # Permissive for local hackathon development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(donations.router, prefix="/api")
app.include_router(riders.router, prefix="/api")
app.include_router(shelters.router, prefix="/api")
app.include_router(compatibility.router, prefix="/api")
app.include_router(allocations.router, prefix="/api")


@app.get("/", tags=["Root"])
def root_info():
    return {
        "project": "TheSaviour",
        "tagline": "Real-time civic aid coordination and zero-waste redistribution",
        "phase": 3,
        "docs": "/docs",
        "endpoints": [
            "/api/health",
            "/api/dashboard",
            "/api/donations",
            "/api/riders",
            "/api/shelters",
            "/api/compatibility/check",
            "/api/allocations/auto",
            "/api/allocations",
        ],
    }
