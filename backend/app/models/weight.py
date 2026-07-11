from sqlalchemy import Column, Integer, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class WeightLog(Base):
    __tablename__ = "weight_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)

    weight_kg = Column(Float, nullable=False)
    body_fat_pct = Column(Float, nullable=True)
    muscle_mass_kg = Column(Float, nullable=True)
    note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="weight_logs")
