from app.models.food import Food


def nutrition_for_amount(food: Food, amount_g: float) -> dict:
    factor = amount_g / 100.0
    return {
        "calories": round(food.calories_per_100g * factor, 1),
        "protein_g": round(food.protein_per_100g * factor, 1),
        "carbs_g": round(food.carbs_per_100g * factor, 1),
        "fat_g": round(food.fat_per_100g * factor, 1),
        "fiber_g": round(food.fiber_per_100g * factor, 1) if food.fiber_per_100g is not None else None,
        "sugar_g": round(food.sugar_per_100g * factor, 1) if food.sugar_per_100g is not None else None,
    }


def scale_amount_to_calories(food: Food, target_calories: float) -> float:
    if food.calories_per_100g == 0:
        return 0.0
    return round((target_calories / food.calories_per_100g) * 100, 1)
