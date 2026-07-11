from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.meal import MealCategory, MealLog, MealLogItem
from app.models.food import Food
from app.schemas.meal import (
    MealCategoryOut,
    MealLogCreate,
    MealLogOut,
    MealLogItemOut,
    DailySummary,
)
from app.services.nutrition import nutrition_for_amount

router = APIRouter(tags=["meals"])


# ---------------------------------------------------------------------------
# Meal Categories
# ---------------------------------------------------------------------------

@router.get("/meal-categories", response_model=List[MealCategoryOut])
def list_meal_categories(db: Session = Depends(get_db)):
    return db.query(MealCategory).order_by(MealCategory.sort_order, MealCategory.name).all()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_meal_log_out(log: MealLog) -> MealLogOut:
    """Enrich a MealLog ORM object with computed nutrition totals."""
    items_out = []
    total_calories = total_protein = total_carbs = total_fat = 0.0

    for item in log.items:
        nutrition = nutrition_for_amount(item.food, item.amount_g)
        item_out = MealLogItemOut(
            id=item.id,
            food_id=item.food_id,
            amount_g=item.amount_g,
            food=item.food,
            calories=nutrition["calories"],
            protein_g=nutrition["protein_g"],
            carbs_g=nutrition["carbs_g"],
            fat_g=nutrition["fat_g"],
        )
        items_out.append(item_out)
        total_calories += nutrition["calories"]
        total_protein += nutrition["protein_g"]
        total_carbs += nutrition["carbs_g"]
        total_fat += nutrition["fat_g"]

    return MealLogOut(
        id=log.id,
        user_id=log.user_id,
        date=log.date,
        category_id=log.category_id,
        category=log.category,
        note=log.note,
        items=items_out,
        created_at=log.created_at,
        total_calories=round(total_calories, 1),
        total_protein_g=round(total_protein, 1),
        total_carbs_g=round(total_carbs, 1),
        total_fat_g=round(total_fat, 1),
    )


# ---------------------------------------------------------------------------
# Meal Logs
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/meals", response_model=List[MealLogOut])
def list_meal_logs(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = db.query(MealLog).filter(MealLog.user_id == user_id)
    if start_date:
        query = query.filter(MealLog.date >= start_date)
    if end_date:
        query = query.filter(MealLog.date <= end_date)
    logs = query.order_by(MealLog.date.desc(), MealLog.id.asc()).all()
    return [_build_meal_log_out(log) for log in logs]


@router.get("/users/{user_id}/meals/daily/{log_date}", response_model=DailySummary)
def get_daily_summary(user_id: int, log_date: date, db: Session = Depends(get_db)):
    logs = (
        db.query(MealLog)
        .filter(MealLog.user_id == user_id, MealLog.date == log_date)
        .order_by(MealLog.id.asc())
        .all()
    )
    meals_out = [_build_meal_log_out(log) for log in logs]
    total_calories = sum(m.total_calories for m in meals_out)
    total_protein = sum(m.total_protein_g for m in meals_out)
    total_carbs = sum(m.total_carbs_g for m in meals_out)
    total_fat = sum(m.total_fat_g for m in meals_out)

    return DailySummary(
        date=log_date,
        total_calories=round(total_calories, 1),
        total_protein_g=round(total_protein, 1),
        total_carbs_g=round(total_carbs, 1),
        total_fat_g=round(total_fat, 1),
        meals=meals_out,
    )


@router.post("/users/{user_id}/meals", response_model=MealLogOut, status_code=201)
def create_meal_log(user_id: int, payload: MealLogCreate, db: Session = Depends(get_db)):
    # Validate category exists
    category = db.query(MealCategory).filter(MealCategory.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Meal category not found")

    log = MealLog(
        user_id=user_id,
        date=payload.date,
        category_id=payload.category_id,
        note=payload.note,
    )
    db.add(log)
    db.flush()  # get log.id

    for item_data in payload.items:
        food = db.query(Food).filter(Food.id == item_data.food_id).first()
        if not food:
            raise HTTPException(status_code=404, detail=f"Food {item_data.food_id} not found")
        item = MealLogItem(
            meal_log_id=log.id,
            food_id=item_data.food_id,
            amount_g=item_data.amount_g,
        )
        db.add(item)

    db.commit()
    db.refresh(log)
    return _build_meal_log_out(log)


@router.delete("/users/{user_id}/meals/{meal_id}", status_code=204)
def delete_meal_log(user_id: int, meal_id: int, db: Session = Depends(get_db)):
    log = db.query(MealLog).filter(MealLog.id == meal_id, MealLog.user_id == user_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Meal log not found")
    db.delete(log)
    db.commit()
