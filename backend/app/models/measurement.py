from sqlalchemy import Column, Integer, Float, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class BodyMeasurement(Base):
    __tablename__ = "body_measurements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    measurement_type = Column(String, nullable=False)
    value_cm = Column(Float, nullable=False)
    note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="body_measurements")
