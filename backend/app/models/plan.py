from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    note = Column(Text, nullable=True)

    calorie_target = Column(Float, nullable=False)
    protein_target_g = Column(Float, nullable=True)
    carbs_target_g = Column(Float, nullable=True)
    fat_target_g = Column(Float, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="meal_plans")
    items = relationship("MealPlanItem", back_populates="plan", cascade="all, delete-orphan")


class MealPlanItem(Base):
    __tablename__ = "meal_plan_items"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("meal_plans.id"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("meal_categories.id"), nullable=False)
    amount_g = Column(Float, nullable=False)

    plan = relationship("MealPlan", back_populates="items")
    food = relationship("Food", back_populates="meal_plan_items")
    category = relationship("MealCategory", back_populates="meal_plan_items")
