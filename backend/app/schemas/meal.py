from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.schemas.food import FoodOut


class MealCategoryOut(BaseModel):
    id: int
    name: str
    sort_order: int
    emoji: str
    color: str

    model_config = {"from_attributes": True}


class MealLogItemCreate(BaseModel):
    food_id: int
    amount_g: float


class MealLogItemOut(BaseModel):
    id: int
    food_id: int
    amount_g: float
    food: FoodOut

    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0

    model_config = {"from_attributes": True}


class MealLogCreate(BaseModel):
    date: date
    category_id: int
    note: Optional[str] = None
    items: List[MealLogItemCreate] = []


class MealLogOut(BaseModel):
    id: int
    user_id: int
    date: date
    category_id: int
    category: MealCategoryOut
    note: Optional[str] = None
    items: List[MealLogItemOut] = []
    created_at: datetime

    total_calories: float = 0.0
    total_protein_g: float = 0.0
    total_carbs_g: float = 0.0
    total_fat_g: float = 0.0

    model_config = {"from_attributes": True}


class DailySummary(BaseModel):
    date: date
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    meals: List[MealLogOut]
