from app.models.food import Food


def nutrition_for_amount(food: Food, amount_g: float) -> dict:
    """
    Calculate nutrients for `amount_g` of a food.
    All values in the Food model are per serving; we scale by
    (amount_g / serving_size).  Unknown nutrients (None) are treated as 0.
    """
    serving = food.serving_size if food.serving_size and food.serving_size > 0 else 100.0
    factor = amount_g / serving
    return {
        "calories": round(food.calories_per_serving * factor, 1),
        "protein_g": round(food.protein_per_serving * factor, 1),
        "carbs_g": round(food.carbs_per_serving * factor, 1),
        "fat_g": round(food.fat_per_serving * factor, 1),
        "fiber_g": round((food.fiber_per_serving or 0) * factor, 1),
        "sugar_g": round((food.sugar_per_serving or 0) * factor, 1),
        "iron_mg": round((food.iron_per_serving or 0) * factor, 2),
    }


def scale_amount_to_calories(food: Food, target_calories: float) -> float:
    """Return the grams of food needed to reach target_calories."""
    if not food.calories_per_serving or food.calories_per_serving == 0:
        return 0.0
    serving = food.serving_size if food.serving_size and food.serving_size > 0 else 100.0
    return round((target_calories / food.calories_per_serving) * serving, 1)
