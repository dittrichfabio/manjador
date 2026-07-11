from typing import Optional
from app.models.user import Gender, ActivityLevel

ACTIVITY_MULTIPLIERS = {
    ActivityLevel.sedentary: 1.200,
    ActivityLevel.lightly_active: 1.375,
    ActivityLevel.moderately_active: 1.550,
    ActivityLevel.very_active: 1.725,
    ActivityLevel.extra_active: 1.900,
}

DEFICIT_PRESETS = {
    "maintain": 0,
    "mild": 250,
    "moderate": 500,
    "aggressive": 750,
}


def compute_bmr(weight_kg: float, height_cm: float, age: int, gender: Gender) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    if gender == Gender.male:
        return base + 5
    elif gender == Gender.female:
        return base - 161
    else:
        return base - 78


def compute_tdee(bmr: float, activity_level: ActivityLevel) -> float:
    return bmr * ACTIVITY_MULTIPLIERS[activity_level]


def compute_calorie_goal(tdee: float, deficit: str = "moderate") -> float:
    return max(tdee - DEFICIT_PRESETS.get(deficit, 500), 1200)


def compute_macros(calorie_goal: float, weight_kg: float) -> dict:
    protein_g = round(2.0 * weight_kg, 1)
    fat_g = round((calorie_goal * 0.25) / 9, 1)
    protein_kcal = protein_g * 4
    fat_kcal = fat_g * 9
    carbs_g = round(max(calorie_goal - protein_kcal - fat_kcal, 0) / 4, 1)
    return {"protein_g": protein_g, "fat_g": fat_g, "carbs_g": carbs_g}


def get_user_goals(user) -> dict:
    result = {
        "computed_bmr": None,
        "computed_tdee": None,
        "suggested_calories": None,
        "suggested_protein_g": None,
        "suggested_carbs_g": None,
        "suggested_fat_g": None,
        "effective_calories": None,
        "effective_protein_g": None,
        "effective_carbs_g": None,
        "effective_fat_g": None,
    }

    profile_complete = all([
        user.weight_kg, user.height_cm, user.age,
        user.gender, user.activity_level
    ])

    if profile_complete:
        bmr = compute_bmr(user.weight_kg, user.height_cm, user.age, user.gender)
        tdee = compute_tdee(bmr, user.activity_level)
        cal_goal = compute_calorie_goal(tdee)
        macros = compute_macros(cal_goal, user.weight_kg)

        result["computed_bmr"] = round(bmr, 1)
        result["computed_tdee"] = round(tdee, 1)
        result["suggested_calories"] = round(cal_goal, 1)
        result["suggested_protein_g"] = macros["protein_g"]
        result["suggested_carbs_g"] = macros["carbs_g"]
        result["suggested_fat_g"] = macros["fat_g"]

        result["effective_calories"] = user.calorie_goal or round(cal_goal, 1)
        result["effective_protein_g"] = user.protein_goal_g or macros["protein_g"]
        result["effective_carbs_g"] = user.carbs_goal_g or macros["carbs_g"]
        result["effective_fat_g"] = user.fat_goal_g or macros["fat_g"]
    else:
        result["effective_calories"] = user.calorie_goal
        result["effective_protein_g"] = user.protein_goal_g
        result["effective_carbs_g"] = user.carbs_goal_g
        result["effective_fat_g"] = user.fat_goal_g

    return result
