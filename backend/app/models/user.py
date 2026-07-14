from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class ActivityLevel(str, enum.Enum):
    sedentary = "sedentary"
    lightly_active = "lightly_active"
    moderately_active = "moderately_active"
    very_active = "very_active"
    extra_active = "extra_active"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Profile data for TDEE calculation
    age = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    gender = Column(Enum(Gender), nullable=True)
    activity_level = Column(Enum(ActivityLevel), nullable=True)

    # Goals - null means "use computed value"
    calorie_goal = Column(Float, nullable=True)
    protein_goal_g = Column(Float, nullable=True)
    carbs_goal_g = Column(Float, nullable=True)
    fat_goal_g = Column(Float, nullable=True)

    # Dashboard display preferences (JSON-encoded lists stored as strings)
    dashboard_show_tdee = Column(String, default="true")  # "true" or "false"
    dashboard_show_nutrients = Column(String, default='["calories","protein","carbs","fat"]')

    # Relationships
    foods = relationship("Food", back_populates="created_by_user", foreign_keys="Food.created_by")
    weight_logs = relationship("WeightLog", back_populates="user", cascade="all, delete-orphan")
    meal_logs = relationship("MealLog", back_populates="user", cascade="all, delete-orphan")
    body_measurements = relationship("BodyMeasurement", back_populates="user", cascade="all, delete-orphan")
    saved_meals = relationship("SavedMeal", back_populates="user", cascade="all, delete-orphan")
    daily_menus = relationship("DailyMenu", back_populates="user", cascade="all, delete-orphan")
    my_foods = relationship("UserFood", back_populates="user", cascade="all, delete-orphan")
