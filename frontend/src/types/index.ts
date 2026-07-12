export type Gender = "male" | "female" | "other";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

export interface User {
  id: number;
  username: string;
  created_at: string;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  gender?: Gender;
  activity_level?: ActivityLevel;
  calorie_goal?: number;
  protein_goal_g?: number;
  carbs_goal_g?: number;
  fat_goal_g?: number;
  dashboard_show_tdee?: string;      // "true" or "false"
  dashboard_show_nutrients?: string; // JSON array e.g. '["calories","protein"]'
}

export interface UserProfile extends User {
  computed_bmr?: number;
  computed_tdee?: number;
  suggested_calories?: number;
  suggested_protein_g?: number;
  suggested_carbs_g?: number;
  suggested_fat_g?: number;
}

export interface Food {
  id: number;
  name: string;
  brand?: string;
  serving_size: number;
  serving_unit: string;
  /** All nutrient values are per serving_size */
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  fiber_per_serving?: number;  // null = unknown (treated as 0)
  sugar_per_serving?: number;  // null = unknown (treated as 0)
  iron_per_serving?: number;   // mg; null = unknown (treated as 0)
  created_by?: number;
  created_at: string;
  is_verified: boolean;
}

export interface MealCategory {
  id: number;
  name: string;
  sort_order: number;
  emoji: string;
  color: string;
}

export interface MealLogItem {
  id: number;
  food_id: number;
  amount_g: number;
  food: Food;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealLog {
  id: number;
  user_id: number;
  date: string;
  category_id: number;
  category: MealCategory;
  note?: string;
  items: MealLogItem[];
  created_at: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface DailySummary {
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  meals: MealLog[];
}

export interface WeightLog {
  id: number;
  user_id: number;
  date: string;
  weight_kg: number;
  body_fat_pct?: number;
  muscle_mass_kg?: number;
  note?: string;
  created_at: string;
}

export interface BodyMeasurement {
  id: number;
  user_id: number;
  date: string;
  measurement_type: string;
  value_cm: number;
  note?: string;
  created_at: string;
}

export interface MealPlanItem {
  id: number;
  food_id: number;
  category_id: number;
  amount_g: number;
  food: Food;
  category: MealCategory;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealPlan {
  id: number;
  user_id: number;
  name: string;
  note?: string;
  calorie_target: number;
  protein_target_g?: number;
  carbs_target_g?: number;
  fat_target_g?: number;
  items: MealPlanItem[];
  created_at: string;
  updated_at: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface UserFood {
  id: number;
  user_id: number;
  food_id: number;
  food: Food;
  meal_categories: MealCategory[];
  added_at: string;
}

export interface FoodPairing {
  id: number;
  user_id: number;
  food_a_id: number;
  food_b_id: number;
  food_a: Food;
  food_b: Food;
  added_at: string;
}
