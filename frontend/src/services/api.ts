import axios from "axios";
import type {
  User, UserProfile, Food, MealCategory, MealLog, DailySummary,
  WeightLog, BodyMeasurement,
  SavedMeal, MealRecommendationsOut,
  DailyMenu, DailyMenuRecommendationOut,
  WeeklyMenuOut,
  UserFood, FoodPairing, FoodRequirement,
} from "../types";

const api = axios.create({ baseURL: "/api", withCredentials: true });

export const getUsers = () => api.get<User[]>("/users/").then(r => r.data);
export const createUser = (username: string) => api.post<User>("/users/", { username }).then(r => r.data);
export const loginUser = (username: string) => api.post<User>("/users/login", { username }).then(r => r.data);
export const logoutUser = () => api.post("/users/logout");
export const getMe = () => api.get<UserProfile>("/users/me").then(r => r.data);
export const getUser = (id: number) => api.get<UserProfile>(`/users/${id}`).then(r => r.data);
export const updateUser = (id: number, data: Partial<User>) =>
  api.patch<UserProfile>(`/users/${id}`, data).then(r => r.data);

export const getFoods = (search?: string) =>
  api.get<Food[]>("/foods/", { params: search ? { search } : {} }).then(r => r.data);
export const createFood = (data: Omit<Food, "id" | "created_by" | "created_at" | "is_verified">) =>
  api.post<Food>("/foods/", data).then(r => r.data);
export const updateFood = (id: number, data: Partial<Food>) =>
  api.patch<Food>(`/foods/${id}`, data).then(r => r.data);
export const deleteFood = (id: number) => api.delete(`/foods/${id}`);
export const uploadFoodPhoto = (file: File, mode: "label" | "food" = "label") => {
  const form = new FormData();
  form.append("file", file);
  return api.post<Food>(`/foods/upload-photo?mode=${mode}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};

export const getMealCategories = () =>
  api.get<MealCategory[]>("/meal-categories").then(r => r.data);

export const getMealLogs = (userId: number, startDate?: string, endDate?: string) =>
  api.get<MealLog[]>(`/users/${userId}/meals`, {
    params: { start_date: startDate, end_date: endDate },
  }).then(r => r.data);

export const getDailySummary = (userId: number, date: string) =>
  api.get<DailySummary>(`/users/${userId}/meals/daily/${date}`).then(r => r.data);

export const createMealLog = (
  userId: number,
  data: { date: string; category_id: number; note?: string; items: { food_id: number; amount_g: number }[] }
) => api.post<MealLog>(`/users/${userId}/meals`, data).then(r => r.data);

export const deleteMealLog = (userId: number, logId: number) =>
  api.delete(`/users/${userId}/meals/${logId}`);

export const getWeightLogs = (userId: number, startDate?: string, endDate?: string) =>
  api.get<WeightLog[]>(`/users/${userId}/weights`, {
    params: { start_date: startDate, end_date: endDate },
  }).then(r => r.data);

export const createWeightLog = (userId: number, data: Omit<WeightLog, "id" | "user_id" | "created_at">) =>
  api.post<WeightLog>(`/users/${userId}/weights`, data).then(r => r.data);

export const deleteWeightLog = (userId: number, logId: number) =>
  api.delete(`/users/${userId}/weights/${logId}`);

export const getMeasurements = (userId: number, type?: string) =>
  api.get<BodyMeasurement[]>(`/users/${userId}/measurements`, {
    params: type ? { measurement_type: type } : {},
  }).then(r => r.data);

export const getMeasurementTypes = (userId: number) =>
  api.get<string[]>(`/users/${userId}/measurements/types`).then(r => r.data);

export const createMeasurement = (
  userId: number,
  data: Omit<BodyMeasurement, "id" | "user_id" | "created_at">
) => api.post<BodyMeasurement>(`/users/${userId}/measurements`, data).then(r => r.data);

export const deleteMeasurement = (userId: number, mId: number) =>
  api.delete(`/users/${userId}/measurements/${mId}`);

// ── Saved Meals ────────────────────────────────────────────────────────────────

export const getSavedMeals = (userId: number) =>
  api.get<SavedMeal[]>(`/users/${userId}/saved-meals`).then(r => r.data);

export const getSavedMeal = (userId: number, mealId: number) =>
  api.get<SavedMeal>(`/users/${userId}/saved-meals/${mealId}`).then(r => r.data);

export const createSavedMeal = (
  userId: number,
  data: { name: string; calorie_goal: number; category_ids: number[]; items: { food_id: number; amount_g: number }[] }
) => api.post<SavedMeal>(`/users/${userId}/saved-meals`, data).then(r => r.data);

export const updateSavedMeal = (
  userId: number,
  mealId: number,
  data: { name?: string; calorie_goal?: number; category_ids?: number[]; items?: { food_id: number; amount_g: number }[] }
) => api.patch<SavedMeal>(`/users/${userId}/saved-meals/${mealId}`, data).then(r => r.data);

export const deleteSavedMeal = (userId: number, mealId: number) =>
  api.delete(`/users/${userId}/saved-meals/${mealId}`);

export const recommendSavedMeal = (
  userId: number,
  data: { category_ids: number[]; calorie_goal: number }
) => api.post<MealRecommendationsOut>(`/users/${userId}/saved-meals/recommend`, data).then(r => r.data);

// ── Daily Menus ────────────────────────────────────────────────────────────────

export const getDailyMenus = (userId: number) =>
  api.get<DailyMenu[]>(`/users/${userId}/daily-menus`).then(r => r.data);

export const getDailyMenu = (userId: number, menuId: number) =>
  api.get<DailyMenu>(`/users/${userId}/daily-menus/${menuId}`).then(r => r.data);

export type SlotCreate = {
  category_id: number;
  slot_index: number;
  calorie_pct: number;
  saved_meal_id?: number | null;
  items: { food_id: number; amount_g: number }[];
};

export const createDailyMenu = (
  userId: number,
  data: { name: string; calorie_target: number; slots: SlotCreate[] }
) => api.post<DailyMenu>(`/users/${userId}/daily-menus`, data).then(r => r.data);

export const updateDailyMenu = (
  userId: number,
  menuId: number,
  data: { name?: string; calorie_target?: number; slots?: SlotCreate[] }
) => api.patch<DailyMenu>(`/users/${userId}/daily-menus/${menuId}`, data).then(r => r.data);

export const deleteDailyMenu = (userId: number, menuId: number) =>
  api.delete(`/users/${userId}/daily-menus/${menuId}`);

export const recommendDailyMenu = (
  userId: number,
  data: { calorie_target: number; slots: { category_id: number; slot_index: number; calorie_pct: number }[] }
) => api.post<DailyMenuRecommendationOut>(`/users/${userId}/daily-menus/recommend`, data).then(r => r.data);

// ── Weekly Menus ───────────────────────────────────────────────────────────────

export const generateWeeklyMenu = (
  userId: number,
  data: { num_days: number; num_picks: number }
) => api.post<WeeklyMenuOut>(`/users/${userId}/weekly-menus/generate`, data).then(r => r.data);

export const exportWeights = (userId: number) =>
  window.open(`/api/users/${userId}/data/export/weights`);
export const exportMeasurements = (userId: number) =>
  window.open(`/api/users/${userId}/data/export/measurements`);
export const exportNutrition = (userId: number) =>
  window.open(`/api/users/${userId}/data/export/nutrition`);

export const importWeights = (userId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/users/${userId}/data/import/weights`, form);
};
export const importMeasurements = (userId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/users/${userId}/data/import/measurements`, form);
};
export const importFoods = (userId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/users/${userId}/data/import/foods`, form);
};

// My Foods
export const getMyFoods = (userId: number) =>
  api.get<UserFood[]>(`/users/${userId}/my-foods`).then(r => r.data);

export const addMyFood = (userId: number, data: { food_id: number; meal_category_ids: number[] }) =>
  api.post<UserFood>(`/users/${userId}/my-foods`, data).then(r => r.data);

export const updateMyFood = (userId: number, foodId: number, data: { meal_category_ids: number[] }) =>
  api.patch<UserFood>(`/users/${userId}/my-foods/${foodId}`, data).then(r => r.data);

export const removeMyFood = (userId: number, foodId: number) =>
  api.delete(`/users/${userId}/my-foods/${foodId}`);

export const getMyFoodPairings = (userId: number) =>
  api.get<FoodPairing[]>(`/users/${userId}/my-foods/pairings`).then(r => r.data);

export const addFoodPairing = (userId: number, data: { food_a_id: number; food_b_id: number }) =>
  api.post<FoodPairing>(`/users/${userId}/my-foods/pairings`, data).then(r => r.data);

export const removeFoodPairing = (userId: number, pairingId: number) =>
  api.delete(`/users/${userId}/my-foods/pairings/${pairingId}`);

export const getMyFoodRequirements = (userId: number) =>
  api.get<FoodRequirement[]>(`/users/${userId}/my-foods/requirements`).then(r => r.data);

export const addFoodRequirement = (userId: number, data: { food_id: number; required_food_id: number }) =>
  api.post<FoodRequirement>(`/users/${userId}/my-foods/requirements`, data).then(r => r.data);

export const removeFoodRequirement = (userId: number, requirementId: number) =>
  api.delete(`/users/${userId}/my-foods/requirements/${requirementId}`);
