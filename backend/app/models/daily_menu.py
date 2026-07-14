from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class DailyMenuSlotItem(Base):
    """A food item added directly to a DailyMenuSlot (used when not referencing a SavedMeal)."""
    __tablename__ = "daily_menu_slot_items"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("daily_menu_slots.id", ondelete="CASCADE"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id", ondelete="CASCADE"), nullable=False)
    amount_g = Column(Float, nullable=False)

    slot = relationship("DailyMenuSlot", back_populates="items")
    food = relationship("Food")


class DailyMenuSlot(Base):
    """A single meal slot within a DailyMenu (e.g. Breakfast at 30% of calories).

    A slot is either filled by a SavedMeal reference (saved_meal_id is set)
    or by directly listed DailyMenuSlotItems.
    Multiple slots of the same category are allowed (e.g. 2 snack slots).
    """
    __tablename__ = "daily_menu_slots"

    id = Column(Integer, primary_key=True, index=True)
    menu_id = Column(Integer, ForeignKey("daily_menus.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("meal_categories.id", ondelete="CASCADE"), nullable=False)
    # slot_index differentiates multiple slots of the same category (0-based)
    slot_index = Column(Integer, nullable=False, default=0)
    # percentage of the daily calorie target allocated to this slot (0–100)
    calorie_pct = Column(Float, nullable=False, default=0.0)
    # optional reference to a pre-built SavedMeal
    saved_meal_id = Column(Integer, ForeignKey("saved_meals.id", ondelete="SET NULL"), nullable=True)

    menu = relationship("DailyMenu", back_populates="slots")
    category = relationship("MealCategory")
    saved_meal = relationship("SavedMeal")
    items = relationship("DailyMenuSlotItem", back_populates="slot", cascade="all, delete-orphan")


class DailyMenu(Base):
    """A named daily menu composed of multiple meal slots."""
    __tablename__ = "daily_menus"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    # Total calorie target; defaults to the user's calorie_goal but can be overridden
    calorie_target = Column(Float, nullable=False, default=2000.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="daily_menus")
    slots = relationship("DailyMenuSlot", back_populates="menu", cascade="all, delete-orphan")
