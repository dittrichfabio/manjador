from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class BodyMeasurementCreate(BaseModel):
    date: date
    measurement_type: str
    value_cm: float
    note: Optional[str] = None


class BodyMeasurementOut(BodyMeasurementCreate):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
