from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.food import FoodOut
from app.schemas.meal import MealCategoryOut


class MealPlanItemCreate(BaseModel):
    food_id: int
    category_id: int
    amount_g: float


class MealPlanItemOut(BaseModel):
    id: int
    food_id: int
    category_id: int
    amount_g: float
    food: FoodOut
    category: MealCategoryOut

    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0

    model_config = {"from_attributes": True}


class MealPlanCreate(BaseModel):
    name: str
    note: Optional[str] = None
    calorie_target: float
    protein_target_g: Optional[float] = None
    carbs_target_g: Optional[float] = None
    fat_target_g: Optional[float] = None
    items: List[MealPlanItemCreate] = []


class MealPlanUpdate(BaseModel):
    name: Optional[str] = None
    note: Optional[str] = None
    calorie_target: Optional[float] = None
    protein_target_g: Optional[float] = None
    carbs_target_g: Optional[float] = None
    fat_target_g: Optional[float] = None
    items: Optional[List[MealPlanItemCreate]] = None


class MealPlanOut(BaseModel):
    id: int
    user_id: int
    name: str
    note: Optional[str] = None
    calorie_target: float
    protein_target_g: Optional[float] = None
    carbs_target_g: Optional[float] = None
    fat_target_g: Optional[float] = None
    items: List[MealPlanItemOut] = []
    created_at: datetime
    updated_at: datetime

    total_calories: float = 0.0
    total_protein_g: float = 0.0
    total_carbs_g: float = 0.0
    total_fat_g: float = 0.0

    model_config = {"from_attributes": True}
