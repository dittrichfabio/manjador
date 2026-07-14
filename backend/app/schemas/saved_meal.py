from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.food import FoodOut
from app.schemas.meal import MealCategoryOut


class SavedMealItemCreate(BaseModel):
    food_id: int
    amount_g: float


class SavedMealItemOut(BaseModel):
    id: int
    food_id: int
    amount_g: float
    food: FoodOut

    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0

    model_config = {"from_attributes": True}


class SavedMealCreate(BaseModel):
    name: str
    calorie_goal: float = 0.0
    category_ids: List[int] = []
    items: List[SavedMealItemCreate] = []


class SavedMealUpdate(BaseModel):
    name: Optional[str] = None
    calorie_goal: Optional[float] = None
    category_ids: Optional[List[int]] = None
    items: Optional[List[SavedMealItemCreate]] = None


class SavedMealOut(BaseModel):
    id: int
    user_id: int
    name: str
    calorie_goal: float
    meal_categories: List[MealCategoryOut] = []
    items: List[SavedMealItemOut] = []
    created_at: datetime
    updated_at: datetime

    total_calories: float = 0.0
    total_protein_g: float = 0.0
    total_carbs_g: float = 0.0
    total_fat_g: float = 0.0

    model_config = {"from_attributes": True}


# ── Gemini recommendation types ────────────────────────────────────────────────

class MealRecommendationItem(BaseModel):
    food_id: int
    amount_g: float


class MealRecommendation(BaseModel):
    name: str
    items: List[MealRecommendationItem]
    estimated_calories: float


class MealRecommendationsOut(BaseModel):
    recommendations: List[MealRecommendation]
