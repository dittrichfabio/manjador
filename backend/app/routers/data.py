import csv
import io
from typing import List, Optional
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.weight import WeightLog
from app.models.measurement import BodyMeasurement
from app.models.meal import MealLog, MealLogItem, MealCategory
from app.models.food import Food
from app.schemas.food import FoodCreate
from app.services.nutrition import nutrition_for_amount

router = APIRouter(tags=["data"])


# ---------------------------------------------------------------------------
# CSV Export helpers
# ---------------------------------------------------------------------------

def _csv_response(rows: List[dict], filename: str) -> StreamingResponse:
    if not rows:
        rows = [{}]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Export endpoints
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/data/export/weights")
def export_weights(
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
    logs = query.order_by(WeightLog.date).all()

    rows = [
        {
            "date": str(log.date),
            "weight_kg": log.weight_kg,
            "body_fat_pct": log.body_fat_pct,
            "muscle_mass_kg": log.muscle_mass_kg,
            "note": log.note or "",
        }
        for log in logs
    ]
    return _csv_response(rows or [{"date": "", "weight_kg": "", "body_fat_pct": "", "muscle_mass_kg": "", "note": ""}], "weights.csv")


@router.get("/users/{user_id}/data/export/measurements")
def export_measurements(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = db.query(BodyMeasurement).filter(BodyMeasurement.user_id == user_id)
    if start_date:
        query = query.filter(BodyMeasurement.date >= start_date)
    if end_date:
        query = query.filter(BodyMeasurement.date <= end_date)
    measurements = query.order_by(BodyMeasurement.date).all()

    rows = [
        {
            "date": str(m.date),
            "measurement_type": m.measurement_type,
            "value_cm": m.value_cm,
            "note": m.note or "",
        }
        for m in measurements
    ]
    return _csv_response(
        rows or [{"date": "", "measurement_type": "", "value_cm": "", "note": ""}],
        "measurements.csv",
    )


@router.get("/users/{user_id}/data/export/nutrition")
def export_nutrition(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(MealLog)
        .filter(MealLog.user_id == user_id)
    )
    if start_date:
        query = query.filter(MealLog.date >= start_date)
    if end_date:
        query = query.filter(MealLog.date <= end_date)
    logs = query.order_by(MealLog.date).all()

    rows = []
    for log in logs:
        for item in log.items:
            nutrition = nutrition_for_amount(item.food, item.amount_g)
            rows.append({
                "date": str(log.date),
                "meal_category": log.category.name,
                "food_name": item.food.name,
                "food_brand": item.food.brand or "",
                "amount_g": item.amount_g,
                "calories": nutrition["calories"],
                "protein_g": nutrition["protein_g"],
                "carbs_g": nutrition["carbs_g"],
                "fat_g": nutrition["fat_g"],
                "fiber_g": nutrition.get("fiber_g", ""),
                "sugar_g": nutrition.get("sugar_g", ""),
                "iron_mg": nutrition.get("iron_mg", ""),
            })

    empty_row = {
        "date": "", "meal_category": "", "food_name": "", "food_brand": "",
        "amount_g": "", "calories": "", "protein_g": "", "carbs_g": "",
        "fat_g": "", "fiber_g": "", "sugar_g": "", "iron_mg": "",
    }
    return _csv_response(rows or [empty_row], "nutrition.csv")


# ---------------------------------------------------------------------------
# Import endpoints
# ---------------------------------------------------------------------------

@router.post("/users/{user_id}/data/import/weights", status_code=201)
async def import_weights(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    created = 0
    for row in reader:
        try:
            log = WeightLog(
                user_id=user_id,
                date=date.fromisoformat(row["date"].strip()),
                weight_kg=float(row["weight_kg"]),
                body_fat_pct=float(row["body_fat_pct"]) if row.get("body_fat_pct", "").strip() else None,
                muscle_mass_kg=float(row["muscle_mass_kg"]) if row.get("muscle_mass_kg", "").strip() else None,
                note=row.get("note", "").strip() or None,
            )
            db.add(log)
            created += 1
        except (KeyError, ValueError) as e:
            raise HTTPException(status_code=422, detail=f"Row parsing error: {e}")
    db.commit()
    return {"imported": created}


@router.post("/users/{user_id}/data/import/measurements", status_code=201)
async def import_measurements(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    created = 0
    for row in reader:
        try:
            m = BodyMeasurement(
                user_id=user_id,
                date=date.fromisoformat(row["date"].strip()),
                measurement_type=row["measurement_type"].strip(),
                value_cm=float(row["value_cm"]),
                note=row.get("note", "").strip() or None,
            )
            db.add(m)
            created += 1
        except (KeyError, ValueError) as e:
            raise HTTPException(status_code=422, detail=f"Row parsing error: {e}")
    db.commit()
    return {"imported": created}


@router.post("/users/{user_id}/data/import/foods", status_code=201)
async def import_foods(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    created = 0
    for row in reader:
        try:
            def _opt_col(key: str) -> float | None:
                v = row.get(key, "").strip()
                return float(v) if v else None

            food = Food(
                name=row["name"].strip(),
                brand=row.get("brand", "").strip() or None,
                serving_size=float(row.get("serving_size", 100) or 100),
                serving_unit=row.get("serving_unit", "g").strip() or "g",
                calories_per_serving=float(row["calories_per_serving"]),
                protein_per_serving=float(row.get("protein_per_serving") or 0),
                carbs_per_serving=float(row.get("carbs_per_serving") or 0),
                fat_per_serving=float(row.get("fat_per_serving") or 0),
                fiber_per_serving=_opt_col("fiber_per_serving"),
                sugar_per_serving=_opt_col("sugar_per_serving"),
                iron_per_serving=_opt_col("iron_per_serving"),
                created_by=user_id,
            )
            db.add(food)
            created += 1
        except (KeyError, ValueError) as e:
            raise HTTPException(status_code=422, detail=f"Row parsing error: {e}")
    db.commit()
    return {"imported": created}
