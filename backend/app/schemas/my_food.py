from pydantic import BaseModel
from typing import List
from datetime import datetime

from app.schemas.food import FoodOut
from app.schemas.meal import MealCategoryOut


class UserFoodCreate(BaseModel):
    food_id: int
    meal_category_ids: List[int] = []


class UserFoodUpdate(BaseModel):
    meal_category_ids: List[int]


class UserFoodOut(BaseModel):
    id: int
    user_id: int
    food_id: int
    food: FoodOut
    meal_categories: List[MealCategoryOut] = []
    added_at: datetime

    model_config = {"from_attributes": True}


class FoodPairingCreate(BaseModel):
    food_a_id: int
    food_b_id: int


class FoodPairingOut(BaseModel):
    id: int
    user_id: int
    food_a_id: int
    food_b_id: int
    food_a: FoodOut
    food_b: FoodOut
    added_at: datetime

    model_config = {"from_attributes": True}


class FoodRequirementCreate(BaseModel):
    food_id: int
    required_food_id: int


class FoodRequirementOut(BaseModel):
    id: int
    user_id: int
    food_id: int
    required_food_id: int
    food: FoodOut
    required_food: FoodOut
    added_at: datetime

    model_config = {"from_attributes": True}
