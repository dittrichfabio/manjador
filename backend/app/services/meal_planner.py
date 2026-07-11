from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.food import Food
from app.models.meal import MealLog, MealLogItem
from app.services.nutrition import nutrition_for_amount, scale_amount_to_calories


def suggest_plan(
    db: Session,
    user_id: int,
    calorie_target: float,
    category_splits: Dict[int, float],
    max_foods_per_category: int = 3,
) -> List[dict]:
    preferred: Dict[int, List[int]] = _preferred_foods_by_category(db, user_id)

    all_foods = db.query(Food).order_by(Food.created_at.desc()).all()
    all_food_ids = [f.id for f in all_foods]
    food_map = {f.id: f for f in all_foods}

    results = []
    for category_id, fraction in category_splits.items():
        cat_calories = calorie_target * fraction
        if cat_calories <= 0:
            continue

        candidates = preferred.get(category_id, [])
        for fid in all_food_ids:
            if fid not in candidates:
                candidates.append(fid)
            if len(candidates) >= max_foods_per_category:
                break

        if not candidates:
            continue

        per_food_calories = cat_calories / len(candidates[:max_foods_per_category])
        for food_id in candidates[:max_foods_per_category]:
            food = food_map.get(food_id)
            if food is None:
                continue
            amount_g = scale_amount_to_calories(food, per_food_calories)
            nutrition = nutrition_for_amount(food, amount_g)
            results.append({
                "category_id": category_id,
                "food_id": food_id,
                "amount_g": amount_g,
                **nutrition,
            })

    return results


def _preferred_foods_by_category(db: Session, user_id: int) -> Dict[int, List[int]]:
    rows = (
        db.query(MealLogItem.food_id, MealLog.category_id)
        .join(MealLog, MealLogItem.meal_log_id == MealLog.id)
        .filter(MealLog.user_id == user_id)
        .all()
    )
    freq: Dict[int, Dict[int, int]] = {}
    for food_id, cat_id in rows:
        freq.setdefault(cat_id, {}).setdefault(food_id, 0)
        freq[cat_id][food_id] += 1

    result = {}
    for cat_id, counts in freq.items():
        result[cat_id] = sorted(counts, key=lambda fid: counts[fid], reverse=True)
    return result
