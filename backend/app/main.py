from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import users, weights, measurements, foods, meals, plans, data

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


# ---------------------------------------------------------------------------
# Startup: create tables + seed meal categories
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup_event():
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
