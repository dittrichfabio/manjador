from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class MealCategory(Base):
    __tablename__ = "meal_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    sort_order = Column(Integer, default=0)
    emoji = Column(String, default="\U0001f37d")
    color = Column(String, default="#6366f1")

    meal_logs = relationship("MealLog", back_populates="category")
    meal_plan_items = relationship("MealPlanItem", back_populates="category")


class MealLog(Base):
    __tablename__ = "meal_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("meal_categories.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="meal_logs")
    category = relationship("MealCategory", back_populates="meal_logs")
    items = relationship("MealLogItem", back_populates="meal_log", cascade="all, delete-orphan")


class MealLogItem(Base):
    __tablename__ = "meal_log_items"

    id = Column(Integer, primary_key=True, index=True)
    meal_log_id = Column(Integer, ForeignKey("meal_logs.id"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False)
    amount_g = Column(Float, nullable=False)

    meal_log = relationship("MealLog", back_populates="items")
    food = relationship("Food", back_populates="meal_log_items")
