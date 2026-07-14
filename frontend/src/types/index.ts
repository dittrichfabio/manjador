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

// ── Saved Meals ───────────────────────────────────────────────────────────────

export interface SavedMealItem {
  id: number;
  food_id: number;
  amount_g: number;
  food: Food;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface SavedMeal {
  id: number;
  user_id: number;
  name: string;
  calorie_goal: number;
  meal_categories: MealCategory[];
  items: SavedMealItem[];
  created_at: string;
  updated_at: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface MealRecommendationItem {
  food_id: number;
  amount_g: number;
}

export interface MealRecommendation {
  name: string;
  items: MealRecommendationItem[];
  estimated_calories: number;
}

export interface MealRecommendationsOut {
  recommendations: MealRecommendation[];
}

// ── Daily Menus ───────────────────────────────────────────────────────────────

export interface DailyMenuSlotItem {
  id: number;
  food_id: number;
  amount_g: number;
  food: Food;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DailyMenuSlot {
  id: number;
  menu_id: number;
  category_id: number;
  slot_index: number;
  calorie_pct: number;
  saved_meal_id?: number | null;
  category: MealCategory;
  saved_meal?: SavedMeal | null;
  items: DailyMenuSlotItem[];
  calorie_target: number;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface DailyMenu {
  id: number;
  user_id: number;
  name: string;
  calorie_target: number;
  slots: DailyMenuSlot[];
  created_at: string;
  updated_at: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface DailyMenuRecommendationSlotItem {
  food_id: number;
  amount_g: number;
}

export interface DailyMenuRecommendationSlot {
  category_id: number;
  slot_index: number;
  saved_meal_id?: number | null;
  items: DailyMenuRecommendationSlotItem[];
  estimated_calories: number;
}

export interface DailyMenuRecommendationOut {
  slots: DailyMenuRecommendationSlot[];
}

// ── Weekly Menus ──────────────────────────────────────────────────────────────

export interface WeeklyMenuDay {
  day: number;
  daily_menu: DailyMenu;
}

export interface WeeklyMenuOut {
  days: WeeklyMenuDay[];
  num_picks: number;
  daily_menu_ids_used: number[];
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

export interface FoodRequirement {
  id: number;
  user_id: number;
  food_id: number;
  required_food_id: number;
  food: Food;
  required_food: Food;
  added_at: string;
}
