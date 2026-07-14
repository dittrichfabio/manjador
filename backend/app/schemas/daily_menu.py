from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.food import FoodOut
from app.schemas.meal import MealCategoryOut
from app.schemas.saved_meal import SavedMealOut


class DailyMenuSlotItemCreate(BaseModel):
    food_id: int
    amount_g: float


class DailyMenuSlotItemOut(BaseModel):
    id: int
    food_id: int
    amount_g: float
    food: FoodOut

    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0

    model_config = {"from_attributes": True}


class DailyMenuSlotCreate(BaseModel):
    category_id: int
    slot_index: int = 0
    calorie_pct: float = 0.0
    saved_meal_id: Optional[int] = None
    items: List[DailyMenuSlotItemCreate] = []


class DailyMenuSlotUpdate(BaseModel):
    category_id: Optional[int] = None
    slot_index: Optional[int] = None
    calorie_pct: Optional[float] = None
    saved_meal_id: Optional[int] = None
    items: Optional[List[DailyMenuSlotItemCreate]] = None


class DailyMenuSlotOut(BaseModel):
    id: int
    menu_id: int
    category_id: int
    slot_index: int
    calorie_pct: float
    saved_meal_id: Optional[int] = None

    category: MealCategoryOut
    saved_meal: Optional[SavedMealOut] = None
    items: List[DailyMenuSlotItemOut] = []

    calorie_target: float = 0.0   # computed = menu.calorie_target * calorie_pct / 100
    total_calories: float = 0.0
    total_protein_g: float = 0.0
    total_carbs_g: float = 0.0
    total_fat_g: float = 0.0

    model_config = {"from_attributes": True}


class DailyMenuCreate(BaseModel):
    name: str
    calorie_target: float = 2000.0
    slots: List[DailyMenuSlotCreate] = []


class DailyMenuUpdate(BaseModel):
    name: Optional[str] = None
    calorie_target: Optional[float] = None
    slots: Optional[List[DailyMenuSlotCreate]] = None


class DailyMenuOut(BaseModel):
    id: int
    user_id: int
    name: str
    calorie_target: float
    slots: List[DailyMenuSlotOut] = []
    created_at: datetime
    updated_at: datetime

    total_calories: float = 0.0
    total_protein_g: float = 0.0
    total_carbs_g: float = 0.0
    total_fat_g: float = 0.0

    model_config = {"from_attributes": True}


# ── Weekly Menu types (not persisted) ─────────────────────────────────────────

class WeeklyMenuRequest(BaseModel):
    num_days: int
    num_picks: int


class WeeklyMenuDay(BaseModel):
    day: int  # 1-based day number
    daily_menu: DailyMenuOut


class WeeklyMenuOut(BaseModel):
    days: List[WeeklyMenuDay]
    num_picks: int
    daily_menu_ids_used: List[int]


# ── Gemini recommendation types ────────────────────────────────────────────────

class DailyMenuRecommendationSlotItem(BaseModel):
    food_id: int
    amount_g: float


class DailyMenuRecommendationSlot(BaseModel):
    category_id: int
    slot_index: int
    saved_meal_id: Optional[int] = None
    items: List[DailyMenuRecommendationSlotItem]
    estimated_calories: float


class DailyMenuRecommendationOut(BaseModel):
    slots: List[DailyMenuRecommendationSlot]
