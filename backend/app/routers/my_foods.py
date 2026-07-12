from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.food import Food
from app.models.meal import MealCategory
from app.models.my_food import FoodPairing, UserFood, UserFoodCategory
from app.schemas.my_food import (
    FoodPairingCreate,
    FoodPairingOut,
    UserFoodCreate,
    UserFoodOut,
    UserFoodUpdate,
)

router = APIRouter(tags=["my-foods"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_user_food_or_404(user_id: int, food_id: int, db: Session) -> UserFood:
    uf = (
        db.query(UserFood)
        .filter(UserFood.user_id == user_id, UserFood.food_id == food_id)
        .first()
    )
    if not uf:
        raise HTTPException(status_code=404, detail="Food not in My Foods")
    return uf


def _set_categories(user_food: UserFood, category_ids: List[int], db: Session) -> None:
    """Replace the meal category assignments for a UserFood entry."""
    # Remove existing
    db.query(UserFoodCategory).filter(
        UserFoodCategory.user_food_id == user_food.id
    ).delete()
    # Add new
    for cat_id in category_ids:
        cat = db.query(MealCategory).filter(MealCategory.id == cat_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Meal category {cat_id} not found")
        db.add(UserFoodCategory(user_food_id=user_food.id, category_id=cat_id))


# ---------------------------------------------------------------------------
# My Foods endpoints
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/my-foods", response_model=List[UserFoodOut])
def list_my_foods(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(UserFood)
        .filter(UserFood.user_id == user_id)
        .order_by(UserFood.added_at.desc())
        .all()
    )


@router.post("/users/{user_id}/my-foods", response_model=UserFoodOut, status_code=201)
def add_my_food(user_id: int, payload: UserFoodCreate, db: Session = Depends(get_db)):
    # Verify food exists
    food = db.query(Food).filter(Food.id == payload.food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    # Check for duplicate
    existing = (
        db.query(UserFood)
        .filter(UserFood.user_id == user_id, UserFood.food_id == payload.food_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Food already in My Foods")

    user_food = UserFood(user_id=user_id, food_id=payload.food_id)
    db.add(user_food)
    db.flush()  # need user_food.id for categories

    _set_categories(user_food, payload.meal_category_ids, db)
    db.commit()
    db.refresh(user_food)
    return user_food


@router.patch("/users/{user_id}/my-foods/{food_id}", response_model=UserFoodOut)
def update_my_food(
    user_id: int, food_id: int, payload: UserFoodUpdate, db: Session = Depends(get_db)
):
    user_food = _get_user_food_or_404(user_id, food_id, db)
    _set_categories(user_food, payload.meal_category_ids, db)
    db.commit()
    db.refresh(user_food)
    return user_food


@router.delete("/users/{user_id}/my-foods/{food_id}", status_code=204)
def remove_my_food(user_id: int, food_id: int, db: Session = Depends(get_db)):
    user_food = _get_user_food_or_404(user_id, food_id, db)
    db.delete(user_food)
    db.commit()


# ---------------------------------------------------------------------------
# Pairings endpoints
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/my-foods/pairings", response_model=List[FoodPairingOut])
def list_pairings(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(FoodPairing)
        .filter(FoodPairing.user_id == user_id)
        .order_by(FoodPairing.added_at.desc())
        .all()
    )


@router.post("/users/{user_id}/my-foods/pairings", response_model=FoodPairingOut, status_code=201)
def add_pairing(user_id: int, payload: FoodPairingCreate, db: Session = Depends(get_db)):
    a, b = payload.food_a_id, payload.food_b_id
    if a == b:
        raise HTTPException(status_code=400, detail="Cannot pair a food with itself")

    # Enforce canonical order so (a,b) and (b,a) are treated identically
    low, high = min(a, b), max(a, b)

    # Check both foods are in the user's My Foods
    for fid in (low, high):
        exists = (
            db.query(UserFood)
            .filter(UserFood.user_id == user_id, UserFood.food_id == fid)
            .first()
        )
        if not exists:
            raise HTTPException(
                status_code=400,
                detail=f"Food {fid} is not in your My Foods list",
            )

    # Check for duplicate pairing
    existing = (
        db.query(FoodPairing)
        .filter(
            FoodPairing.user_id == user_id,
            FoodPairing.food_a_id == low,
            FoodPairing.food_b_id == high,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Pairing already exists")

    pairing = FoodPairing(user_id=user_id, food_a_id=low, food_b_id=high)
    db.add(pairing)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Pairing already exists")
    db.refresh(pairing)
    return pairing


@router.delete("/users/{user_id}/my-foods/pairings/{pairing_id}", status_code=204)
def remove_pairing(user_id: int, pairing_id: int, db: Session = Depends(get_db)):
    pairing = (
        db.query(FoodPairing)
        .filter(FoodPairing.id == pairing_id, FoodPairing.user_id == user_id)
        .first()
    )
    if not pairing:
        raise HTTPException(status_code=404, detail="Pairing not found")
    db.delete(pairing)
    db.commit()
