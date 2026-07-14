from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.food import Food
from app.models.meal import MealCategory
from app.models.my_food import UserFood
from app.models.saved_meal import SavedMeal
from app.models.daily_menu import DailyMenu, DailyMenuSlot, DailyMenuSlotItem
from app.models.user import User
from app.schemas.daily_menu import (
    DailyMenuCreate,
    DailyMenuUpdate,
    DailyMenuOut,
    DailyMenuSlotOut,
    DailyMenuSlotItemOut,
    DailyMenuRecommendationOut,
)
from app.schemas.meal import MealCategoryOut
from app.services.nutrition import nutrition_for_amount
from app.services.gemini import recommend_daily_menu
from app.routers.saved_meals import _build_meal_out as _build_saved_meal_out

router = APIRouter(tags=["daily_menus"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_slot_item_out(item: DailyMenuSlotItem) -> DailyMenuSlotItemOut:
    nutrition = nutrition_for_amount(item.food, item.amount_g)
    return DailyMenuSlotItemOut(
        id=item.id,
        food_id=item.food_id,
        amount_g=item.amount_g,
        food=item.food,
        calories=nutrition["calories"],
        protein_g=nutrition["protein_g"],
        carbs_g=nutrition["carbs_g"],
        fat_g=nutrition["fat_g"],
    )


def _build_slot_out(slot: DailyMenuSlot, menu_calorie_target: float) -> DailyMenuSlotOut:
    calorie_target = round(menu_calorie_target * slot.calorie_pct / 100.0, 1)

    # If slot references a saved meal, compute nutrition from it
    if slot.saved_meal_id and slot.saved_meal:
        saved_meal_out = _build_saved_meal_out(slot.saved_meal)
        items_out = []
        total_calories = saved_meal_out.total_calories
        total_protein = saved_meal_out.total_protein_g
        total_carbs = saved_meal_out.total_carbs_g
        total_fat = saved_meal_out.total_fat_g
    else:
        saved_meal_out = None
        items_out = [_build_slot_item_out(item) for item in slot.items]
        total_calories = sum(i.calories for i in items_out)
        total_protein = sum(i.protein_g for i in items_out)
        total_carbs = sum(i.carbs_g for i in items_out)
        total_fat = sum(i.fat_g for i in items_out)

    category_out = MealCategoryOut(
        id=slot.category.id,
        name=slot.category.name,
        sort_order=slot.category.sort_order,
        emoji=slot.category.emoji,
        color=slot.category.color,
    )

    return DailyMenuSlotOut(
        id=slot.id,
        menu_id=slot.menu_id,
        category_id=slot.category_id,
        slot_index=slot.slot_index,
        calorie_pct=slot.calorie_pct,
        saved_meal_id=slot.saved_meal_id,
        category=category_out,
        saved_meal=saved_meal_out,
        items=items_out,
        calorie_target=calorie_target,
        total_calories=round(total_calories, 1),
        total_protein_g=round(total_protein, 1),
        total_carbs_g=round(total_carbs, 1),
        total_fat_g=round(total_fat, 1),
    )


def _build_menu_out(menu: DailyMenu) -> DailyMenuOut:
    slots_out = [_build_slot_out(slot, menu.calorie_target) for slot in menu.slots]
    total_calories = sum(s.total_calories for s in slots_out)
    total_protein = sum(s.total_protein_g for s in slots_out)
    total_carbs = sum(s.total_carbs_g for s in slots_out)
    total_fat = sum(s.total_fat_g for s in slots_out)

    return DailyMenuOut(
        id=menu.id,
        user_id=menu.user_id,
        name=menu.name,
        calorie_target=menu.calorie_target,
        slots=slots_out,
        created_at=menu.created_at,
        updated_at=menu.updated_at,
        total_calories=round(total_calories, 1),
        total_protein_g=round(total_protein, 1),
        total_carbs_g=round(total_carbs, 1),
        total_fat_g=round(total_fat, 1),
    )


def _upsert_slots(menu: DailyMenu, slots_data: list, db: Session):
    for slot in menu.slots:
        db.delete(slot)
    db.flush()

    for slot_data in slots_data:
        cat = db.query(MealCategory).filter(MealCategory.id == slot_data.category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {slot_data.category_id} not found")

        saved_meal = None
        if slot_data.saved_meal_id:
            saved_meal = db.query(SavedMeal).filter(
                SavedMeal.id == slot_data.saved_meal_id,
                SavedMeal.user_id == menu.user_id,
            ).first()
            if not saved_meal:
                raise HTTPException(
                    status_code=404,
                    detail=f"SavedMeal {slot_data.saved_meal_id} not found",
                )

        slot = DailyMenuSlot(
            menu_id=menu.id,
            category_id=slot_data.category_id,
            slot_index=slot_data.slot_index,
            calorie_pct=slot_data.calorie_pct,
            saved_meal_id=slot_data.saved_meal_id,
        )
        db.add(slot)
        db.flush()

        if not slot_data.saved_meal_id:
            for item_data in slot_data.items:
                food = db.query(Food).filter(Food.id == item_data.food_id).first()
                if not food:
                    raise HTTPException(status_code=404, detail=f"Food {item_data.food_id} not found")
                db.add(DailyMenuSlotItem(
                    slot_id=slot.id,
                    food_id=item_data.food_id,
                    amount_g=item_data.amount_g,
                ))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/daily-menus", response_model=List[DailyMenuOut])
def list_daily_menus(user_id: int, db: Session = Depends(get_db)):
    menus = (
        db.query(DailyMenu)
        .filter(DailyMenu.user_id == user_id)
        .order_by(DailyMenu.created_at.desc())
        .all()
    )
    return [_build_menu_out(m) for m in menus]


@router.get("/users/{user_id}/daily-menus/{menu_id}", response_model=DailyMenuOut)
def get_daily_menu(user_id: int, menu_id: int, db: Session = Depends(get_db)):
    menu = db.query(DailyMenu).filter(DailyMenu.id == menu_id, DailyMenu.user_id == user_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Daily menu not found")
    return _build_menu_out(menu)


@router.post("/users/{user_id}/daily-menus", response_model=DailyMenuOut, status_code=201)
def create_daily_menu(user_id: int, payload: DailyMenuCreate, db: Session = Depends(get_db)):
    # If calorie_target is not explicitly overridden (still the default 2000),
    # try to pull from the user's profile goal
    calorie_target = payload.calorie_target
    if calorie_target == 2000.0:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.calorie_goal:
            calorie_target = user.calorie_goal

    menu = DailyMenu(user_id=user_id, name=payload.name, calorie_target=calorie_target)
    db.add(menu)
    db.flush()
    _upsert_slots(menu, payload.slots, db)
    db.commit()
    db.refresh(menu)
    return _build_menu_out(menu)


@router.patch("/users/{user_id}/daily-menus/{menu_id}", response_model=DailyMenuOut)
def update_daily_menu(user_id: int, menu_id: int, payload: DailyMenuUpdate, db: Session = Depends(get_db)):
    menu = db.query(DailyMenu).filter(DailyMenu.id == menu_id, DailyMenu.user_id == user_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Daily menu not found")

    update_data = payload.model_dump(exclude_unset=True)
    slots_data = update_data.pop("slots", None)

    for field, value in update_data.items():
        setattr(menu, field, value)

    if slots_data is not None:
        _upsert_slots(menu, payload.slots, db)

    db.commit()
    db.refresh(menu)
    return _build_menu_out(menu)


@router.delete("/users/{user_id}/daily-menus/{menu_id}", status_code=204)
def delete_daily_menu(user_id: int, menu_id: int, db: Session = Depends(get_db)):
    menu = db.query(DailyMenu).filter(DailyMenu.id == menu_id, DailyMenu.user_id == user_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Daily menu not found")
    db.delete(menu)
    db.commit()


# ---------------------------------------------------------------------------
# Gemini recommendation
# ---------------------------------------------------------------------------

@router.post("/users/{user_id}/daily-menus/recommend", response_model=DailyMenuRecommendationOut)
async def recommend_daily_menu_endpoint(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Ask Gemini to recommend a full daily menu filling all requested slots.

    Expected payload:
        calorie_target: float
        slots: List[{category_id: int, slot_index: int, calorie_pct: float}]
    """
    from pydantic import BaseModel

    class SlotSpec(BaseModel):
        category_id: int
        slot_index: int = 0
        calorie_pct: float

    class RecommendRequest(BaseModel):
        calorie_target: float
        slots: List[SlotSpec]

    req = RecommendRequest(**payload)

    # Build slots description
    slots_lines = []
    for slot in req.slots:
        cat = db.query(MealCategory).filter(MealCategory.id == slot.category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category {slot.category_id} not found")
        slot_calories = round(req.calorie_target * slot.calorie_pct / 100.0, 1)
        slots_lines.append(
            f"  - category_id={slot.category_id}, name=\"{cat.name}\", "
            f"slot_index={slot.slot_index}, calorie_target={slot_calories} kcal "
            f"({slot.calorie_pct}% of {req.calorie_target})"
        )
    slots_description = "\n".join(slots_lines)

    # Get user's saved meals
    saved_meals = db.query(SavedMeal).filter(SavedMeal.user_id == user_id).all()
    saved_meals_lines = []
    for sm in saved_meals:
        cat_names = ", ".join(smc.category.name for smc in sm.saved_meal_categories)
        saved_meals_lines.append(
            f"  - id={sm.id}, name=\"{sm.name}\", "
            f"categories=[{cat_names}], calorie_goal={sm.calorie_goal}"
        )
    saved_meals_list = "\n".join(saved_meals_lines) if saved_meals_lines else "  (none saved yet)"

    # Get foods from My Foods, grouped by category
    all_category_ids = list({slot.category_id for slot in req.slots})
    user_food_rows = db.query(UserFood).filter(UserFood.user_id == user_id).all()

    foods_by_cat: dict = {}
    for uf in user_food_rows:
        for ufc in uf.user_food_categories:
            if ufc.category_id in all_category_ids:
                foods_by_cat.setdefault(ufc.category_id, []).append(uf.food)

    foods_by_cat_lines = []
    for cat_id in all_category_ids:
        cat = db.query(MealCategory).filter(MealCategory.id == cat_id).first()
        cat_name = cat.name if cat else str(cat_id)
        foods = foods_by_cat.get(cat_id, [])
        if foods:
            food_strs = ", ".join(
                f"id={f.id} \"{f.name}\" ({f.calories_per_serving} kcal/{f.serving_size}g)"
                for f in foods
            )
        else:
            food_strs = "(no foods tagged for this category)"
        foods_by_cat_lines.append(f"  {cat_name} (category_id={cat_id}): {food_strs}")
    foods_by_category = "\n".join(foods_by_cat_lines)

    context = {
        "total_calories": req.calorie_target,
        "slots_description": slots_description,
        "saved_meals_list": saved_meals_list,
        "foods_by_category": foods_by_category,
    }

    try:
        result = await recommend_daily_menu(context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc

    return DailyMenuRecommendationOut(**result)
