from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.measurement import BodyMeasurement
from app.schemas.measurement import BodyMeasurementCreate, BodyMeasurementOut

router = APIRouter(tags=["measurements"])


@router.get("/users/{user_id}/measurements", response_model=List[BodyMeasurementOut])
def list_measurements(
    user_id: int,
    measurement_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = db.query(BodyMeasurement).filter(BodyMeasurement.user_id == user_id)
    if measurement_type:
        query = query.filter(BodyMeasurement.measurement_type == measurement_type)
    if start_date:
        query = query.filter(BodyMeasurement.date >= start_date)
    if end_date:
        query = query.filter(BodyMeasurement.date <= end_date)
    return query.order_by(BodyMeasurement.date.desc()).all()


@router.get("/users/{user_id}/measurements/types", response_model=List[str])
def list_measurement_types(user_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(BodyMeasurement.measurement_type)
        .filter(BodyMeasurement.user_id == user_id)
        .distinct()
        .order_by(BodyMeasurement.measurement_type)
        .all()
    )
    return [r[0] for r in rows]


@router.post("/users/{user_id}/measurements", response_model=BodyMeasurementOut, status_code=201)
def create_measurement(user_id: int, payload: BodyMeasurementCreate, db: Session = Depends(get_db)):
    m = BodyMeasurement(user_id=user_id, **payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/users/{user_id}/measurements/{m_id}", status_code=204)
def delete_measurement(user_id: int, m_id: int, db: Session = Depends(get_db)):
    m = db.query(BodyMeasurement).filter(BodyMeasurement.id == m_id, BodyMeasurement.user_id == user_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Measurement not found")
    db.delete(m)
    db.commit()
