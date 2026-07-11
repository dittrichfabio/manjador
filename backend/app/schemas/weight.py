from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class WeightLogCreate(BaseModel):
    date: date
    weight_kg: float
    body_fat_pct: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    note: Optional[str] = None


class WeightLogOut(WeightLogCreate):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
