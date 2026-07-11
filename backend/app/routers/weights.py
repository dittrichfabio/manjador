from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.weight import WeightLog
from app.schemas.weight import WeightLogCreate, WeightLogOut

router = APIRouter(tags=["weights"])


@router.get("/users/{user_id}/weights", response_model=List[WeightLogOut])
def list_weight_logs(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = db.query(WeightLog).filter(WeightLog.user_id == user_id)
    if start_date:
        query = query.filter(WeightLog.date >= start_date)
    if end_date:
        query = query.filter(WeightLog.date <= end_date)
    return query.order_by(WeightLog.date.desc()).all()


@router.post("/users/{user_id}/weights", response_model=WeightLogOut, status_code=201)
def create_weight_log(user_id: int, payload: WeightLogCreate, db: Session = Depends(get_db)):
    log = WeightLog(user_id=user_id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.patch("/users/{user_id}/weights/{log_id}", response_model=WeightLogOut)
def update_weight_log(user_id: int, log_id: int, payload: WeightLogCreate, db: Session = Depends(get_db)):
    log = db.query(WeightLog).filter(WeightLog.id == log_id, WeightLog.user_id == user_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Weight log not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/users/{user_id}/weights/{log_id}", status_code=204)
def delete_weight_log(user_id: int, log_id: int, db: Session = Depends(get_db)):
    log = db.query(WeightLog).filter(WeightLog.id == log_id, WeightLog.user_id == user_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Weight log not found")
    db.delete(log)
    db.commit()
