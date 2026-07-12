from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.user import Gender, ActivityLevel


class UserCreate(BaseModel):
    username: str


class UserUpdate(BaseModel):
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    gender: Optional[Gender] = None
    activity_level: Optional[ActivityLevel] = None
    calorie_goal: Optional[float] = None
    protein_goal_g: Optional[float] = None
    carbs_goal_g: Optional[float] = None
    fat_goal_g: Optional[float] = None
    dashboard_show_tdee: Optional[str] = None
    dashboard_show_nutrients: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    created_at: datetime
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    gender: Optional[Gender] = None
    activity_level: Optional[ActivityLevel] = None
    calorie_goal: Optional[float] = None
    protein_goal_g: Optional[float] = None
    carbs_goal_g: Optional[float] = None
    fat_goal_g: Optional[float] = None
    dashboard_show_tdee: Optional[str] = "true"
    dashboard_show_nutrients: Optional[str] = '["calories","protein","carbs","fat"]'

    model_config = {"from_attributes": True}


class UserProfile(UserOut):
    computed_bmr: Optional[float] = None
    computed_tdee: Optional[float] = None
    suggested_calories: Optional[float] = None
    suggested_protein_g: Optional[float] = None
    suggested_carbs_g: Optional[float] = None
    suggested_fat_g: Optional[float] = None
