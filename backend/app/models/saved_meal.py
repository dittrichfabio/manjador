from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class SavedMealCategory(Base):
    """Junction table: which meal categories a SavedMeal belongs to."""
    __tablename__ = "saved_meal_categories"
    __table_args__ = (UniqueConstraint("meal_id", "category_id", name="uq_saved_meal_category"),)

    meal_id = Column(Integer, ForeignKey("saved_meals.id", ondelete="CASCADE"), primary_key=True)
    category_id = Column(Integer, ForeignKey("meal_categories.id", ondelete="CASCADE"), primary_key=True)

    meal = relationship("SavedMeal", back_populates="saved_meal_categories")
    category = relationship("MealCategory")


class SavedMealItem(Base):
    """A food item within a saved meal, with a specific amount."""
    __tablename__ = "saved_meal_items"

    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("saved_meals.id", ondelete="CASCADE"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id", ondelete="CASCADE"), nullable=False)
    amount_g = Column(Float, nullable=False)

    meal = relationship("SavedMeal", back_populates="items")
    food = relationship("Food")


class SavedMeal(Base):
    """A named, reusable meal belonging to one or more meal categories."""
    __tablename__ = "saved_meals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    calorie_goal = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="saved_meals")
    saved_meal_categories = relationship(
        "SavedMealCategory", back_populates="meal", cascade="all, delete-orphan"
    )
    items = relationship("SavedMealItem", back_populates="meal", cascade="all, delete-orphan")

    @property
    def meal_categories(self):
        return [smc.category for smc in self.saved_meal_categories]
