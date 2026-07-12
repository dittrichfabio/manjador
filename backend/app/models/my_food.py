from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class UserFoodCategory(Base):
    """Junction table: which meal categories a user has assigned to a UserFood entry."""
    __tablename__ = "user_food_categories"

    user_food_id = Column(Integer, ForeignKey("user_foods.id", ondelete="CASCADE"), primary_key=True)
    category_id = Column(Integer, ForeignKey("meal_categories.id", ondelete="CASCADE"), primary_key=True)

    user_food = relationship("UserFood", back_populates="user_food_categories")
    category = relationship("MealCategory")


class UserFood(Base):
    """A food item that a user has added to their personal 'My Foods' list."""
    __tablename__ = "user_foods"
    __table_args__ = (UniqueConstraint("user_id", "food_id", name="uq_user_food"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    food_id = Column(Integer, ForeignKey("foods.id", ondelete="CASCADE"), nullable=False)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="my_foods")
    food = relationship("Food", back_populates="user_food_entries")
    user_food_categories = relationship(
        "UserFoodCategory",
        back_populates="user_food",
        cascade="all, delete-orphan",
    )

    @property
    def meal_categories(self):
        return [ufc.category for ufc in self.user_food_categories]


class FoodPairing(Base):
    """A bidirectional pairing between two foods in a user's My Foods list."""
    __tablename__ = "food_pairings"
    __table_args__ = (UniqueConstraint("user_id", "food_a_id", "food_b_id", name="uq_food_pairing"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    food_a_id = Column(Integer, ForeignKey("foods.id", ondelete="CASCADE"), nullable=False)
    food_b_id = Column(Integer, ForeignKey("foods.id", ondelete="CASCADE"), nullable=False)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    food_a = relationship("Food", foreign_keys=[food_a_id])
    food_b = relationship("Food", foreign_keys=[food_b_id])
