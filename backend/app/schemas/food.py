from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FoodBase(BaseModel):
    name: str
    brand: Optional[str] = None
    serving_size: float = 100.0
    serving_unit: str = "g"
    calories_per_100g: float
    protein_per_100g: float = 0.0
    carbs_per_100g: float = 0.0
    fat_per_100g: float = 0.0
    fiber_per_100g: Optional[float] = None
    sugar_per_100g: Optional[float] = None


class FoodCreate(FoodBase):
    pass


class FoodUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    serving_size: Optional[float] = None
    serving_unit: Optional[str] = None
    calories_per_100g: Optional[float] = None
    protein_per_100g: Optional[float] = None
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    fiber_per_100g: Optional[float] = None
    sugar_per_100g: Optional[float] = None
    is_verified: Optional[bool] = None


class FoodOut(FoodBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    is_verified: bool

    model_config = {"from_attributes": True}


class FoodNutritionPerServing(BaseModel):
    food_id: int
    name: str
    amount_g: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
