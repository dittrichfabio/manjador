import logging
import os
import shutil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Cookie
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.food import Food
from app.schemas.food import FoodCreate, FoodUpdate, FoodOut
from app.config import settings

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("/", response_model=List[FoodOut])
def list_foods(
    search: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Food)
    if search:
        query = query.filter(Food.name.ilike(f"%{search}%"))
    return query.order_by(Food.name).offset(skip).limit(limit).all()


@router.post("/", response_model=FoodOut, status_code=201)
def create_food(
    payload: FoodCreate,
    user_id: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    food = Food(
        **payload.model_dump(),
        created_by=int(user_id) if user_id else None,
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


@router.post("/upload-photo", response_model=FoodOut, status_code=201)
async def upload_food_photo(
    file: UploadFile = File(...),
    mode: str = Query(default="label", pattern="^(label|food)$"),
    user_id: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    """Upload a food photo and extract nutrition data via Gemini AI.

    mode=label  (default) – photo of a nutrition facts label; reads exact values.
    mode=food             – photo of the food itself; estimates typical values.
    """
    from app.services.gemini import extract_nutrition_from_image

    # Save the uploaded file temporarily
    upload_dir = settings.upload_dir
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
    tmp_path = os.path.join(upload_dir, f"tmp_{file.filename}{ext}" if not file.filename.endswith(ext) else f"tmp_{file.filename}")

    try:
        with open(tmp_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

        # Extract nutrition data from the image
        try:
            nutrition_data = await extract_nutrition_from_image(tmp_path, mode=mode)
        except ValueError as exc:
            logger.error("Gemini response parse error: %s", exc)
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            logger.error("Gemini API error: %s", exc, exc_info=True)
            raise HTTPException(
                status_code=503,
                detail=f"Gemini API error: {exc}",
            ) from exc
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    def _opt(key: str) -> float | None:
        v = nutrition_data.get(key)
        return float(v) if v is not None else None

    # Build the food entry from Gemini response
    food = Food(
        name=nutrition_data.get("name", "Unknown Food"),
        brand=nutrition_data.get("brand"),
        serving_size=float(nutrition_data.get("serving_size") or 100.0),
        serving_unit=nutrition_data.get("serving_unit", "g"),
        calories_per_serving=float(nutrition_data.get("calories_per_serving") or 0),
        protein_per_serving=float(nutrition_data.get("protein_per_serving") or 0),
        carbs_per_serving=float(nutrition_data.get("carbs_per_serving") or 0),
        fat_per_serving=float(nutrition_data.get("fat_per_serving") or 0),
        fiber_per_serving=_opt("fiber_per_serving"),
        sugar_per_serving=_opt("sugar_per_serving"),
        iron_per_serving=_opt("iron_per_serving"),
        created_by=int(user_id) if user_id else None,
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


@router.get("/{food_id}", response_model=FoodOut)
def get_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    return food


@router.patch("/{food_id}", response_model=FoodOut)
def update_food(food_id: int, payload: FoodUpdate, db: Session = Depends(get_db)):
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(food, field, value)
    db.commit()
    db.refresh(food)
    return food


@router.delete("/{food_id}", status_code=204)
def delete_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    db.delete(food)
    db.commit()
