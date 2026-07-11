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
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
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
