from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Food(Base):
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    brand = Column(String, nullable=True)

    # Serving info — all nutrient values are per this serving
    serving_size = Column(Float, default=100.0)
    serving_unit = Column(String, default="g")

    # Nutrition per serving
    calories_per_serving = Column(Float, nullable=False)
    protein_per_serving = Column(Float, default=0.0)
    carbs_per_serving = Column(Float, default=0.0)
    fat_per_serving = Column(Float, default=0.0)
    fiber_per_serving = Column(Float, nullable=True)   # null = unknown
    sugar_per_serving = Column(Float, nullable=True)   # null = unknown
    iron_per_serving = Column(Float, nullable=True)    # mg; null = unknown

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_verified = Column(Boolean, default=False)

    # Relationships
    created_by_user = relationship("User", back_populates="foods", foreign_keys=[created_by])
    meal_log_items = relationship("MealLogItem", back_populates="food")
    meal_plan_items = relationship("MealPlanItem", back_populates="food")
    user_food_entries = relationship("UserFood", back_populates="food")
