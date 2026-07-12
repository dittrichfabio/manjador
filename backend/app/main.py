import logging
import sqlite3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import users, weights, measurements, foods, meals, plans, data, my_foods

logger = logging.getLogger(__name__)


def _migrate_users_table():
    """
    Add dashboard_show_tdee and dashboard_show_nutrients columns if missing.
    Safe to run on every startup.
    """
    from app.config import settings

    db_path = settings.database_url.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    try:
        info = conn.execute("PRAGMA table_info(users)").fetchall()
        if not info:
            return  # table doesn't exist yet
        columns = {row[1] for row in info}
        
        if "dashboard_show_tdee" not in columns:
            logger.info("Adding dashboard_show_tdee column to users table")
            conn.execute('ALTER TABLE users ADD COLUMN dashboard_show_tdee VARCHAR DEFAULT "true"')
            conn.commit()
        
        if "dashboard_show_nutrients" not in columns:
            logger.info("Adding dashboard_show_nutrients column to users table")
            conn.execute('ALTER TABLE users ADD COLUMN dashboard_show_nutrients VARCHAR DEFAULT \'["calories","protein","carbs","fat"]\'')
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _migrate_foods_table():
    """
    One-time migration: rename *_per_100g columns to *_per_serving and add iron.
    Uses table-recreation because SQLite has limited ALTER TABLE support.
    Safe to run on every startup — skipped if already migrated.
    """
    from app.config import settings

    db_path = settings.database_url.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    try:
        info = conn.execute("PRAGMA table_info(foods)").fetchall()
        if not info:
            return  # table doesn't exist yet, create_all will handle it
        columns = {row[1] for row in info}
        if "calories_per_100g" not in columns:
            return  # already migrated

        logger.info("Migrating foods table: renaming _per_100g → _per_serving, adding iron")
        conn.executescript("""
            BEGIN;

            CREATE TABLE foods_new (
                id          INTEGER PRIMARY KEY,
                name        VARCHAR NOT NULL,
                brand       VARCHAR,
                serving_size FLOAT DEFAULT 100.0,
                serving_unit VARCHAR DEFAULT 'g',
                calories_per_serving FLOAT NOT NULL,
                protein_per_serving  FLOAT DEFAULT 0.0,
                carbs_per_serving    FLOAT DEFAULT 0.0,
                fat_per_serving      FLOAT DEFAULT 0.0,
                fiber_per_serving    FLOAT,
                sugar_per_serving    FLOAT,
                iron_per_serving     FLOAT,
                created_by  INTEGER REFERENCES users(id),
                created_at  DATETIME,
                is_verified BOOLEAN DEFAULT 0
            );

            INSERT INTO foods_new (
                id, name, brand, serving_size, serving_unit,
                calories_per_serving, protein_per_serving, carbs_per_serving,
                fat_per_serving, fiber_per_serving, sugar_per_serving,
                iron_per_serving, created_by, created_at, is_verified
            )
            SELECT
                id, name, brand, serving_size, serving_unit,
                calories_per_100g, protein_per_100g, carbs_per_100g,
                fat_per_100g, fiber_per_100g, sugar_per_100g,
                NULL, created_by, created_at, is_verified
            FROM foods;

            DROP TABLE foods;
            ALTER TABLE foods_new RENAME TO foods;
            CREATE INDEX IF NOT EXISTS ix_foods_id   ON foods(id);
            CREATE INDEX IF NOT EXISTS ix_foods_name ON foods(name);

            COMMIT;
        """)
        logger.info("Foods table migration complete")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Manjador API",
    description="Nutrition & fitness tracking backend",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers  (all under /api prefix)
# ---------------------------------------------------------------------------

app.include_router(users.router, prefix="/api")
app.include_router(weights.router, prefix="/api")
app.include_router(measurements.router, prefix="/api")
app.include_router(foods.router, prefix="/api")
app.include_router(meals.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(data.router, prefix="/api")
app.include_router(my_foods.router, prefix="/api")


# ---------------------------------------------------------------------------
# Startup: create tables + seed meal categories
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup_event():
    # Migrate existing schema if needed
    _migrate_users_table()  # add dashboard preferences
    _migrate_foods_table()  # rename _per_100g → _per_serving, add iron
    # Create all tables if they do not exist yet
    Base.metadata.create_all(bind=engine)

    # Seed default meal categories if the table is empty
    from sqlalchemy.orm import Session
    from app.database import SessionLocal
    from app.models.meal import MealCategory

    db: Session = SessionLocal()
    try:
        if db.query(MealCategory).count() == 0:
            default_categories = [
                MealCategory(name="Breakfast", sort_order=1, emoji="\U0001f373", color="#f59e0b"),
                MealCategory(name="Lunch",     sort_order=2, emoji="\U0001f35c", color="#10b981"),
                MealCategory(name="Dinner",    sort_order=3, emoji="\U0001f372", color="#6366f1"),
                MealCategory(name="Snack",     sort_order=4, emoji="\U0001f34e", color="#ec4899"),
            ]
            db.add_all(default_categories)
            db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}
