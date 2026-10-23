# TheSaviour - Local Setup Guide (Without Docker)

This guide provides exact, step-by-step instructions to run the **TheSaviour** backend and frontend locally for development and demonstration.

---

## Prerequisites

- **Python**: 3.11+
- **Node.js**: v18+ or v20+ (with `npm`)
- Operating System: Windows, macOS, or Linux

---

## Step 1: Run the Backend (FastAPI)

Open a terminal (Terminal 1) in the repository root directory (`TheSaviour - Copy`):

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. (Optional) Create and activate a Python virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On macOS/Linux:
# source .venv/bin/activate

# 3. Install required Python dependencies
pip install -r requirements.txt

# 4. Start the FastAPI development server with hot reload
python -m uvicorn app.main:app --reload --port 8000
```

- **Backend API root**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Verified GET Endpoints:
- `GET http://localhost:8000/api/health` - Health check & record counts
- `GET http://localhost:8000/api/dashboard` - Aggregated summary stats & urgent batches
- `GET http://localhost:8000/api/donations` - Perishable food & aid inventory (supports `?urgency=CRITICAL`)
- `GET http://localhost:8000/api/riders` - Volunteer two-wheeler fleet (supports `?status=AVAILABLE`)
- `GET http://localhost:8000/api/shelters` - Night shelters & relief camps with capabilities

---

## Step 2: Run the Frontend (React + Vite + Tailwind)

Open a second terminal (Terminal 2) in the repository root directory (`TheSaviour - Copy`):

```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node.js dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

- **Frontend URL**: [http://localhost:5173](http://localhost:5173)

The Vite development server is pre-configured with a reverse proxy for `/api` pointing to `http://127.0.0.1:8000`, so no manual CORS or environment variable setup is required.

---

## Step 3: Google Maps & Interactive Map (Optional)

The interactive map works out-of-the-box using the built-in **Pune Relief Corridor Fallback Canvas** and geodesic route engine without any API keys.

If you have a Google Maps API Key:
1. **Frontend Map Display**:
   Copy `frontend/.env.example` to `frontend/.env.local`:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY="AIzaSyYourKeyHere"
   ```
2. **Backend Real Road Routes (Optional)**:
   Copy `.env.example` to `.env`:
   ```bash
   GOOGLE_MAPS_API_KEY="AIzaSyYourServerKeyHere"
   ```

*Note: Environment files (`.env`, `.env.local`) are strictly excluded in `.gitignore`.*

---

## Step 4: Running Tests

To run the automated backend test suite covering all endpoints, response models, and filters:

```powershell
# From the repository root
python -m pytest backend/tests/test_api.py -v
```

To build and type-check the frontend production bundle:

```powershell
# From the frontend directory
cd frontend
npm run build
```

---

## Project Structure Overview

```
TheSaviour - Copy/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & CORS configuration
│   │   ├── models.py            # Pydantic schemas (Donation, Rider, Shelter, etc.)
│   │   ├── seed_data.py         # Realistic demo seed data (Pune disaster corridor)
│   │   ├── store.py             # In-memory repository interface
│   │   └── api/                 # Sub-routers (/health, /dashboard, /donations, /riders, /shelters)
│   ├── requirements.txt         # FastAPI, Uvicorn, Pydantic, Pytest
│   └── tests/
│       └── test_api.py          # Pytest suite verifying all 5 GET endpoints
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main dashboard view with real-time API binding
│   │   ├── components/          # Navbar, SummaryCards, UrgencySection, Activity, etc.
│   │   ├── services/api.ts      # Typed API client connecting to FastAPI
│   │   └── types/index.ts       # TypeScript models matching backend schemas
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts           # Development server with /api proxy
├── SETUP.md                     # This setup guide
├── .gitignore                   # Ignores .venv, node_modules, cache, dist
└── README.md                    # Core architectural specification
```
