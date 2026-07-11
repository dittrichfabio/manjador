from typing import List, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.meal import MealCategory
from app.models.plan import MealPlan, MealPlanItem
from app.models.food import Food
from app.schemas.plan import (
    MealPlanCreate,
    MealPlanUpdate,
    MealPlanOut,
    MealPlanItemOut,
)
from app.services.nutrition import nutrition_for_amount
from app.services.meal_planner import suggest_plan

router = APIRouter(tags=["plans"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_plan_out(plan: MealPlan) -> MealPlanOut:
    """Enrich a MealPlan ORM object with computed nutrition totals."""
    items_out = []
    total_calories = total_protein = total_carbs = total_fat = 0.0

    for item in plan.items:
        nutrition = nutrition_for_amount(item.food, item.amount_g)
        item_out = MealPlanItemOut(
            id=item.id,
            food_id=item.food_id,
            category_id=item.category_id,
            amount_g=item.amount_g,
            food=item.food,
            category=item.category,
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

    return MealPlanOut(
        id=plan.id,
        user_id=plan.user_id,
        name=plan.name,
        note=plan.note,
        calorie_target=plan.calorie_target,
        protein_target_g=plan.protein_target_g,
        carbs_target_g=plan.carbs_target_g,
        fat_target_g=plan.fat_target_g,
        items=items_out,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        total_calories=round(total_calories, 1),
        total_protein_g=round(total_protein, 1),
        total_carbs_g=round(total_carbs, 1),
        total_fat_g=round(total_fat, 1),
    )


def _upsert_items(plan: MealPlan, items_data: list, db: Session):
    """Replace all items on a plan with new ones."""
    for item in plan.items:
        db.delete(item)
    db.flush()
    for item_data in items_data:
        food = db.query(Food).filter(Food.id == item_data.food_id).first()
        if not food:
            raise HTTPException(status_code=404, detail=f"Food {item_data.food_id} not found")
        category = db.query(MealCategory).filter(MealCategory.id == item_data.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail=f"Category {item_data.category_id} not found")
        db.add(MealPlanItem(
            plan_id=plan.id,
            food_id=item_data.food_id,
            category_id=item_data.category_id,
            amount_g=item_data.amount_g,
        ))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/plans", response_model=List[MealPlanOut])
def list_plans(user_id: int, db: Session = Depends(get_db)):
    plans = db.query(MealPlan).filter(MealPlan.user_id == user_id).order_by(MealPlan.created_at.desc()).all()
    return [_build_plan_out(p) for p in plans]


@router.post("/users/{user_id}/plans", response_model=MealPlanOut, status_code=201)
def create_plan(user_id: int, payload: MealPlanCreate, db: Session = Depends(get_db)):
    plan = MealPlan(
        user_id=user_id,
        name=payload.name,
        note=payload.note,
        calorie_target=payload.calorie_target,
        protein_target_g=payload.protein_target_g,
        carbs_target_g=payload.carbs_target_g,
        fat_target_g=payload.fat_target_g,
    )
    db.add(plan)
    db.flush()

    _upsert_items(plan, payload.items, db)
    db.commit()
    db.refresh(plan)
    return _build_plan_out(plan)


@router.get("/users/{user_id}/plans/{plan_id}", response_model=MealPlanOut)
def get_plan(user_id: int, plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id, MealPlan.user_id == user_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return _build_plan_out(plan)


@router.patch("/users/{user_id}/plans/{plan_id}", response_model=MealPlanOut)
def update_plan(user_id: int, plan_id: int, payload: MealPlanUpdate, db: Session = Depends(get_db)):
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id, MealPlan.user_id == user_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    update_data = payload.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)

    for field, value in update_data.items():
        setattr(plan, field, value)

    if items_data is not None:
        _upsert_items(plan, payload.items, db)

    db.commit()
    db.refresh(plan)
    return _build_plan_out(plan)


@router.delete("/users/{user_id}/plans/{plan_id}", status_code=204)
def delete_plan(user_id: int, plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id, MealPlan.user_id == user_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()


# ---------------------------------------------------------------------------
# AI-powered plan suggestion
# ---------------------------------------------------------------------------

class SuggestPlanRequest:
    pass


from pydantic import BaseModel


class SuggestPlanBody(BaseModel):
    name: str = "Suggested Plan"
    calorie_target: float
    category_splits: Dict[int, float]  # {category_id: fraction}
    max_foods_per_category: int = 3
    save: bool = True


@router.post("/users/{user_id}/plans/suggest", response_model=MealPlanOut, status_code=201)
def suggest_and_create_plan(user_id: int, payload: SuggestPlanBody, db: Session = Depends(get_db)):
    """Generate a meal plan using the user's food history and calorie target."""
    suggested_items = suggest_plan(
        db=db,
        user_id=user_id,
        calorie_target=payload.calorie_target,
        category_splits=payload.category_splits,
        max_foods_per_category=payload.max_foods_per_category,
    )

    if not suggested_items:
        raise HTTPException(
            status_code=422,
            detail="Could not generate a plan. Add some foods to the database first.",
        )

    plan = MealPlan(
        user_id=user_id,
        name=payload.name,
        calorie_target=payload.calorie_target,
    )
    db.add(plan)
    db.flush()

    for item_data in suggested_items:
        db.add(MealPlanItem(
            plan_id=plan.id,
            food_id=item_data["food_id"],
            category_id=item_data["category_id"],
            amount_g=item_data["amount_g"],
        ))

    if payload.save:
        db.commit()
        db.refresh(plan)
    else:
        db.rollback()
        # Re-build a transient plan object for the response without persisting
        plan = MealPlan(
            id=0,
            user_id=user_id,
            name=payload.name,
            calorie_target=payload.calorie_target,
        )
        plan.items = []

    return _build_plan_out(plan)
