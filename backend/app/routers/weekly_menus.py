import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.daily_menu import DailyMenu
from app.schemas.daily_menu import WeeklyMenuRequest, WeeklyMenuOut, WeeklyMenuDay
from app.routers.daily_menus import _build_menu_out

router = APIRouter(tags=["weekly_menus"])


@router.post("/users/{user_id}/weekly-menus/generate", response_model=WeeklyMenuOut)
def generate_weekly_menu(user_id: int, payload: WeeklyMenuRequest, db: Session = Depends(get_db)):
    """
    Generate a weekly menu by randomly assigning saved Daily Menus to days.

    - num_days: total number of days to cover (e.g. 7)
    - num_picks: how many distinct Daily Menus to draw from (e.g. 2 means
      the week will alternate between 2 different menus)

    The result is NOT persisted.
    """
    if payload.num_days < 1:
        raise HTTPException(status_code=422, detail="num_days must be at least 1")
    if payload.num_picks < 1:
        raise HTTPException(status_code=422, detail="num_picks must be at least 1")

    all_menus = (
        db.query(DailyMenu)
        .filter(DailyMenu.user_id == user_id)
        .order_by(DailyMenu.created_at.desc())
        .all()
    )
    if not all_menus:
        raise HTTPException(
            status_code=422,
            detail="No Daily Menus saved yet. Create and save at least one Daily Menu first.",
        )

    num_picks = min(payload.num_picks, len(all_menus))
    picked_menus = random.sample(all_menus, num_picks)
    picked_ids = [m.id for m in picked_menus]

    # Assign picked menus to days randomly
    days: List[WeeklyMenuDay] = []
    for day_num in range(1, payload.num_days + 1):
        chosen = random.choice(picked_menus)
        days.append(WeeklyMenuDay(day=day_num, daily_menu=_build_menu_out(chosen)))

    return WeeklyMenuOut(
        days=days,
        num_picks=num_picks,
        daily_menu_ids_used=picked_ids,
    )
