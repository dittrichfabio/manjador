from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FoodBase(BaseModel):
    name: str
    brand: Optional[str] = None
    serving_size: float = 100.0
    serving_unit: str = "g"
    calories_per_serving: float
    protein_per_serving: float = 0.0
    carbs_per_serving: float = 0.0
    fat_per_serving: float = 0.0
    fiber_per_serving: Optional[float] = None   # null = unknown, treated as 0
    sugar_per_serving: Optional[float] = None   # null = unknown, treated as 0
    iron_per_serving: Optional[float] = None    # mg; null = unknown, treated as 0


class FoodCreate(FoodBase):
    pass


class FoodUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    serving_size: Optional[float] = None
    serving_unit: Optional[str] = None
    calories_per_serving: Optional[float] = None
    protein_per_serving: Optional[float] = None
    carbs_per_serving: Optional[float] = None
    fat_per_serving: Optional[float] = None
    fiber_per_serving: Optional[float] = None
    sugar_per_serving: Optional[float] = None
    iron_per_serving: Optional[float] = None
    is_verified: Optional[bool] = None


class FoodOut(FoodBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    is_verified: bool

    model_config = {"from_attributes": True}


class FoodNutritionForAmount(BaseModel):
    food_id: int
    name: str
    amount_g: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    iron_mg: Optional[float] = None
