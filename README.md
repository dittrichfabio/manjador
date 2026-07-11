# Manjador

Personal meal planning and nutrition tracking web app.

**Stack:** Python 3.11 + FastAPI · React + TypeScript + Tailwind CSS · SQLite + SQLAlchemy · Google Gemini Flash · Docker Compose + Nginx

---

## Local Development (quick start)

### Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) — Python package manager
- Node.js 18+ and npm

Install `uv` (one-liner):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Backend

```bash
cd backend

# 1. Copy .env and set your Gemini API key
cp .env.example .env
# Edit .env — set GEMINI_API_KEY and SECRET_KEY

# 2. Create venv and install all dependencies
uv venv
uv sync

# 3. Start dev server (hot-reloads on file changes)
uv run uvicorn app.main:app --reload
```

- API: **http://localhost:8000**
- Interactive docs: **http://localhost:8000/docs**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: **http://localhost:5173**  
  (Vite proxies `/api/*` → `localhost:8000` automatically)

---

## Getting a Gemini API Key (free)

1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API key**
3. Add it to `backend/.env` as `GEMINI_API_KEY=your_key`

Free tier: 15 req/min, 1,500 req/day on Gemini 1.5 Flash — more than enough for personal use.

---

## Deploy to Debian Server

### 1. Install Docker

```bash
# On the Debian server
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out and back in after this
```

### 2. Copy project to server

```bash
scp -r /path/to/manjador user@your-server:/opt/manjador
# or: git clone <repo> /opt/manjador
```

### 3. Configure environment

```bash
cd /opt/manjador/backend
cp .env.example .env
# Edit .env — set GEMINI_API_KEY and a secure SECRET_KEY

# Generate a strong SECRET_KEY:
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Build and start

```bash
cd /opt/manjador
docker compose up -d --build
```

App is available at **http://your-server-ip**

### 5. Backup data

All data (SQLite DB + uploaded photos) lives in `./data/`.

```bash
tar -czf manjador-backup-$(date +%Y%m%d).tar.gz /opt/manjador/data/
```

---

## Project Structure

```
manjador/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry + startup seeding
│   │   ├── database.py          # SQLAlchemy + SQLite
│   │   ├── config.py            # Settings loaded from .env
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── routers/             # API route handlers
│   │   ├── services/            # Business logic (TDEE, macros, Gemini, planner)
│   │   └── schemas/             # Pydantic request/response models
│   ├── pyproject.toml           # Python dependencies (uv)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/               # All page components
│   │   ├── components/          # Layout, MacroBar
│   │   ├── services/api.ts      # All API calls (axios)
│   │   ├── hooks/useAuth.ts     # Auth context
│   │   └── types/index.ts       # TypeScript interfaces
│   ├── vite.config.ts           # Dev proxy: /api → :8000
│   └── Dockerfile
├── docker-compose.yml
├── nginx.conf                   # Reverse proxy (port 80)
└── data/                        # SQLite DB + uploads (gitignored)
```

---

## Features

| Feature | Where |
|---|---|
| TDEE & macro goals (Mifflin-St Jeor) | Settings |
| Daily meal logging | Daily Log |
| Meal planning with portion scaling | Meal Planner |
| Food database (manual + photo via Gemini) | Food Database |
| Weight, body fat & muscle tracking | Weight |
| Body circumference measurements | Measurements |
| Charts & trends (weight, calories, macros, measurements) | Charts |
| CSV export (weights / measurements / nutrition) | Settings |
| CSV import (weights / measurements / foods) | Settings |

---

## Adding Meal Categories

Categories are stored in the `meal_categories` table — no code changes needed.
Insert a row directly or via the SQLite CLI:

```sql
INSERT INTO meal_categories (name, sort_order, emoji, color)
VALUES ('pre-workout', 5, '💪', '#8b5cf6');
```

---

## CSV Import Formats

| File | Columns |
|---|---|
| Weights | `date, weight_kg, body_fat_pct, muscle_mass_kg, note` |
| Measurements | `date, measurement_type, value_cm, note` |
| Foods | `name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g` |
