from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.food import Food
from app.models.meal import MealCategory
from app.models.my_food import UserFood, UserFoodCategory
from app.models.saved_meal import SavedMeal, SavedMealCategory, SavedMealItem
from app.schemas.saved_meal import (
    SavedMealCreate,
    SavedMealUpdate,
    SavedMealOut,
    SavedMealItemOut,
    MealRecommendationsOut,
)
from app.schemas.meal import MealCategoryOut
from app.services.nutrition import nutrition_for_amount
from app.services.gemini import recommend_meal

router = APIRouter(tags=["saved_meals"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_item_out(item: SavedMealItem) -> SavedMealItemOut:
    nutrition = nutrition_for_amount(item.food, item.amount_g)
    return SavedMealItemOut(
        id=item.id,
        food_id=item.food_id,
        amount_g=item.amount_g,
        food=item.food,
        calories=nutrition["calories"],
        protein_g=nutrition["protein_g"],
        carbs_g=nutrition["carbs_g"],
        fat_g=nutrition["fat_g"],
    )


def _build_meal_out(meal: SavedMeal) -> SavedMealOut:
    items_out = [_build_item_out(item) for item in meal.items]
    total_calories = sum(i.calories for i in items_out)
    total_protein = sum(i.protein_g for i in items_out)
    total_carbs = sum(i.carbs_g for i in items_out)
    total_fat = sum(i.fat_g for i in items_out)

    categories_out = [
        MealCategoryOut(
            id=smc.category.id,
            name=smc.category.name,
            sort_order=smc.category.sort_order,
            emoji=smc.category.emoji,
            color=smc.category.color,
        )
        for smc in meal.saved_meal_categories
    ]

    return SavedMealOut(
        id=meal.id,
        user_id=meal.user_id,
        name=meal.name,
        calorie_goal=meal.calorie_goal,
        meal_categories=categories_out,
        items=items_out,
        created_at=meal.created_at,
        updated_at=meal.updated_at,
        total_calories=round(total_calories, 1),
        total_protein_g=round(total_protein, 1),
        total_carbs_g=round(total_carbs, 1),
        total_fat_g=round(total_fat, 1),
    )


def _upsert_categories(meal: SavedMeal, category_ids: List[int], db: Session):
    for smc in meal.saved_meal_categories:
        db.delete(smc)
    db.flush()
    for cat_id in category_ids:
        cat = db.query(MealCategory).filter(MealCategory.id == cat_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {cat_id} not found")
        db.add(SavedMealCategory(meal_id=meal.id, category_id=cat_id))


def _upsert_items(meal: SavedMeal, items_data: list, db: Session):
    for item in meal.items:
        db.delete(item)
    db.flush()
    for item_data in items_data:
        food = db.query(Food).filter(Food.id == item_data.food_id).first()
        if not food:
            raise HTTPException(status_code=404, detail=f"Food {item_data.food_id} not found")
        db.add(SavedMealItem(meal_id=meal.id, food_id=item_data.food_id, amount_g=item_data.amount_g))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/saved-meals", response_model=List[SavedMealOut])
def list_saved_meals(user_id: int, db: Session = Depends(get_db)):
    meals = (
        db.query(SavedMeal)
        .filter(SavedMeal.user_id == user_id)
        .order_by(SavedMeal.created_at.desc())
        .all()
    )
    return [_build_meal_out(m) for m in meals]


@router.get("/users/{user_id}/saved-meals/{meal_id}", response_model=SavedMealOut)
def get_saved_meal(user_id: int, meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(SavedMeal).filter(SavedMeal.id == meal_id, SavedMeal.user_id == user_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Saved meal not found")
    return _build_meal_out(meal)


@router.post("/users/{user_id}/saved-meals", response_model=SavedMealOut, status_code=201)
def create_saved_meal(user_id: int, payload: SavedMealCreate, db: Session = Depends(get_db)):
    meal = SavedMeal(
        user_id=user_id,
        name=payload.name,
        calorie_goal=payload.calorie_goal,
    )
    db.add(meal)
    db.flush()
    _upsert_categories(meal, payload.category_ids, db)
    _upsert_items(meal, payload.items, db)
    db.commit()
    db.refresh(meal)
    return _build_meal_out(meal)


@router.patch("/users/{user_id}/saved-meals/{meal_id}", response_model=SavedMealOut)
def update_saved_meal(user_id: int, meal_id: int, payload: SavedMealUpdate, db: Session = Depends(get_db)):
    meal = db.query(SavedMeal).filter(SavedMeal.id == meal_id, SavedMeal.user_id == user_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Saved meal not found")

    update_data = payload.model_dump(exclude_unset=True)
    category_ids = update_data.pop("category_ids", None)
    items_data = update_data.pop("items", None)

    for field, value in update_data.items():
        setattr(meal, field, value)

    if category_ids is not None:
        _upsert_categories(meal, category_ids, db)
    if items_data is not None:
        _upsert_items(meal, payload.items, db)

    db.commit()
    db.refresh(meal)
    return _build_meal_out(meal)


@router.delete("/users/{user_id}/saved-meals/{meal_id}", status_code=204)
def delete_saved_meal(user_id: int, meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(SavedMeal).filter(SavedMeal.id == meal_id, SavedMeal.user_id == user_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Saved meal not found")
    db.delete(meal)
    db.commit()


# ---------------------------------------------------------------------------
# Gemini recommendation
# ---------------------------------------------------------------------------

@router.post("/users/{user_id}/saved-meals/recommend", response_model=MealRecommendationsOut)
async def recommend_saved_meal(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Ask Gemini to recommend 3 meal options.

    Expected payload:
        category_ids: List[int]
        calorie_goal: float
    """
    from pydantic import BaseModel

    class RecommendRequest(BaseModel):
        category_ids: List[int]
        calorie_goal: float

    req = RecommendRequest(**payload)

    # Resolve category names
    categories = (
        db.query(MealCategory).filter(MealCategory.id.in_(req.category_ids)).all()
    )
    if not categories:
        raise HTTPException(status_code=404, detail="No valid categories found")
    cat_names = ", ".join(c.name for c in categories)

    # Get foods from My Foods associated with these categories
    user_food_rows = (
        db.query(UserFood)
        .filter(UserFood.user_id == user_id)
        .all()
    )
    # Filter to foods associated with any of the requested categories
    matching_foods = []
    for uf in user_food_rows:
        uf_cat_ids = {ufc.category_id for ufc in uf.user_food_categories}
        if uf_cat_ids.intersection(set(req.category_ids)):
            matching_foods.append(uf.food)

    if not matching_foods:
        raise HTTPException(
            status_code=422,
            detail="No foods in My Foods are associated with the selected categories. "
                   "Add foods in My Foods and tag them with the appropriate meal category first.",
        )

    foods_lines = []
    for food in matching_foods:
        foods_lines.append(
            f"  - id={food.id}, name=\"{food.name}\", "
            f"serving_size={food.serving_size}g, "
            f"calories_per_serving={food.calories_per_serving} kcal, "
            f"protein={food.protein_per_serving}g, carbs={food.carbs_per_serving}g, "
            f"fat={food.fat_per_serving}g"
        )
    foods_list = "\n".join(foods_lines)

    context = {
        "meal_categories": cat_names,
        "calorie_goal": req.calorie_goal,
        "foods_list": foods_list,
    }

    try:
        result = await recommend_meal(context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc

    return MealRecommendationsOut(**result)
