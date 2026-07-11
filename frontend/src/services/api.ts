import axios from "axios";
import type {
  User, UserProfile, Food, MealCategory, MealLog, DailySummary,
  WeightLog, BodyMeasurement, MealPlan,
} from "../types";

const api = axios.create({ baseURL: "/api", withCredentials: true });

export const getUsers = () => api.get<User[]>("/users/").then(r => r.data);
export const createUser = (username: string) => api.post<User>("/users/", { username }).then(r => r.data);
export const loginUser = (username: string) => api.post<User>("/users/login", { username }).then(r => r.data);
export const logoutUser = () => api.post("/users/logout");
export const getMe = () => api.get<UserProfile>("/users/me").then(r => r.data);
export const getUser = (id: number) => api.get<UserProfile>(`/users/${id}`).then(r => r.data);
export const updateUser = (id: number, data: Partial<User>) =>
  api.patch<User>(`/users/${id}`, data).then(r => r.data);

export const getFoods = (search?: string) =>
  api.get<Food[]>("/foods/", { params: search ? { search } : {} }).then(r => r.data);
export const createFood = (data: Omit<Food, "id" | "created_by" | "created_at" | "is_verified">) =>
  api.post<Food>("/foods/", data).then(r => r.data);
export const updateFood = (id: number, data: Partial<Food>) =>
  api.patch<Food>(`/foods/${id}`, data).then(r => r.data);
export const deleteFood = (id: number) => api.delete(`/foods/${id}`);
export const uploadFoodPhoto = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<Food>("/foods/upload-photo", form, {
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

export const getMealPlans = (userId: number) =>
  api.get<MealPlan[]>(`/users/${userId}/plans`).then(r => r.data);

export const createMealPlan = (
  userId: number,
  data: Omit<MealPlan, "id" | "user_id" | "created_at" | "updated_at" | "total_calories" | "total_protein_g" | "total_carbs_g" | "total_fat_g">
) => api.post<MealPlan>(`/users/${userId}/plans`, data).then(r => r.data);

export const updateMealPlan = (userId: number, planId: number, data: Partial<MealPlan>) =>
  api.patch<MealPlan>(`/users/${userId}/plans/${planId}`, data).then(r => r.data);

export const deleteMealPlan = (userId: number, planId: number) =>
  api.delete(`/users/${userId}/plans/${planId}`);

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
