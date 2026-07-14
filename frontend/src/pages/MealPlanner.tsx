import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2, X, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  getSavedMeals, createSavedMeal, updateSavedMeal, deleteSavedMeal, recommendSavedMeal,
  getDailyMenus, createDailyMenu, updateDailyMenu, deleteDailyMenu, recommendDailyMenu,
  generateWeeklyMenu,
  getMealCategories, getMyFoods, getFoods,
} from "../services/api";
import type { SlotCreate } from "../services/api";
import type {
  Food, MealCategory, UserFood,
  SavedMeal, MealRecommendation,
  DailyMenu, DailyMenuRecommendationOut,
  WeeklyMenuOut,
} from "../types";

// ── Local form types ───────────────────────────────────────────────────────────

interface FoodEntry { food: Food; amount_g: number }

interface MealFormState {
  name: string;
  calorie_goal: string;
  category_ids: number[];
  entries: FoodEntry[];
}

interface SlotForm {
  category_id: number | null;
  slot_index: number;
  calorie_pct: string;
  saved_meal_id: number | null;
  entries: FoodEntry[];
}

interface MenuFormState {
  name: string;
  calorie_target: string;
  slots: SlotForm[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const emptyMealForm = (): MealFormState => ({
  name: "", calorie_goal: "", category_ids: [], entries: [],
});

const emptyMenuForm = (): MenuFormState => ({
  name: "", calorie_target: "2000", slots: [],
});

function calcEntryCalories(entry: FoodEntry): number {
  const serving = entry.food.serving_size || 100;
  return Math.round((entry.food.calories_per_serving * entry.amount_g) / serving);
}

function sumEntryCalories(entries: FoodEntry[]): number {
  return entries.reduce((s, e) => s + calcEntryCalories(e), 0);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FoodPicker({
  myFoods,
  foodTab,
  setFoodTab,
  foodQuery,
  setFoodQuery,
  foodResults,
  onAdd,
}: {
  myFoods: UserFood[];
  foodTab: "my-foods" | "all";
  setFoodTab: (t: "my-foods" | "all") => void;
  foodQuery: string;
  setFoodQuery: (q: string) => void;
  foodResults: Food[];
  onAdd: (food: Food) => void;
}) {
  const filtered = foodTab === "my-foods"
    ? myFoods.filter(uf =>
        !foodQuery.trim() ||
        uf.food.name.toLowerCase().includes(foodQuery.toLowerCase()) ||
        (uf.food.brand ?? "").toLowerCase().includes(foodQuery.toLowerCase())
      )
    : [];

  return (
    <div>
      <div className="flex gap-1 mb-2 border-b border-gray-200">
        {(["my-foods", "all"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setFoodTab(t); setFoodQuery(""); }}
            className={[
              "px-3 py-1.5 text-sm font-medium -mb-px border-b-2 transition-colors",
              foodTab === t
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {t === "my-foods" ? "My Foods" : "All Foods"}
          </button>
        ))}
      </div>
      <input
        className="input"
        placeholder={foodTab === "my-foods" ? "Filter My Foods..." : "Search food database..."}
        value={foodQuery}
        onChange={e => setFoodQuery(e.target.value)}
      />
      <div className="mt-1 border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-50">
        {foodTab === "my-foods" ? (
          filtered.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-3 text-center">
              {myFoods.length === 0 ? "No foods in My Foods yet." : "No matching foods."}
            </p>
          ) : (
            filtered.map(uf => (
              <button
                key={uf.food_id}
                onClick={() => onAdd(uf.food)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm transition-colors"
              >
                <span className="font-medium">{uf.food.name}</span>
                {uf.food.brand && <span className="text-gray-400 ml-1 text-xs">({uf.food.brand})</span>}
                <span className="text-gray-400 ml-2 text-xs">
                  {Math.round(uf.food.calories_per_serving)} kcal/{uf.food.serving_size}{uf.food.serving_unit}
                </span>
              </button>
            ))
          )
        ) : foodResults.length > 0 ? (
          foodResults.map(food => (
            <button
              key={food.id}
              onClick={() => onAdd(food)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm transition-colors"
            >
              <span className="font-medium">{food.name}</span>
              {food.brand && <span className="text-gray-400 ml-1 text-xs">({food.brand})</span>}
              <span className="text-gray-400 ml-2 text-xs">
                {Math.round(food.calories_per_serving)} kcal/{food.serving_size}{food.serving_unit}
              </span>
            </button>
          ))
        ) : (
          <p className="text-sm text-gray-400 px-3 py-3 text-center">
            {foodQuery.trim() ? "No results." : "Type to search the food database."}
          </p>
        )}
      </div>
    </div>
  );
}

function EntryList({
  entries,
  onUpdateAmount,
  onRemove,
}: {
  entries: FoodEntry[];
  onUpdateAmount: (foodId: number, val: string) => void;
  onRemove: (foodId: number) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {entries.map(e => (
        <div key={e.food.id} className="flex items-center gap-2">
          <span className="flex-1 text-sm truncate">{e.food.name}</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={e.amount_g}
            onChange={ev => onUpdateAmount(e.food.id, ev.target.value)}
            className="w-20 input text-right py-1 text-sm"
          />
          <span className="text-xs text-gray-400 w-4">g</span>
          <span className="text-xs text-gray-400 w-16 text-right shrink-0">
            {calcEntryCalories(e)} kcal
          </span>
          <button
            onClick={() => onRemove(e.food.id)}
            className="p-1 text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <div className="text-xs text-gray-500 text-right pt-1">
        Total: {sumEntryCalories(entries)} kcal
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MealPlanner() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"meals" | "daily-menus" | "weekly">("meals");

  // Shared data
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [myFoods, setMyFoods] = useState<UserFood[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Meals tab ────────────────────────────────────────────────────────────────
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [creatingMeal, setCreatingMeal] = useState(false);
  const [mealForm, setMealForm] = useState<MealFormState>(emptyMealForm());
  const [mealFoodTab, setMealFoodTab] = useState<"my-foods" | "all">("my-foods");
  const [mealFoodQuery, setMealFoodQuery] = useState("");
  const [mealFoodResults, setMealFoodResults] = useState<Food[]>([]);
  const [savingMeal, setSavingMeal] = useState(false);
  const [mealError, setMealError] = useState("");
  const [mealRecommending, setMealRecommending] = useState(false);
  const [mealRecommendations, setMealRecommendations] = useState<MealRecommendation[] | null>(null);

  // ── Daily Menus tab ──────────────────────────────────────────────────────────
  const [dailyMenus, setDailyMenus] = useState<DailyMenu[]>([]);
  const [savedMealsForMenu, setSavedMealsForMenu] = useState<SavedMeal[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [creatingMenu, setCreatingMenu] = useState(false);
  const [menuForm, setMenuForm] = useState<MenuFormState>(emptyMenuForm());
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
  const [slotFoodTab, setSlotFoodTab] = useState<"my-foods" | "all">("my-foods");
  const [slotFoodQuery, setSlotFoodQuery] = useState("");
  const [slotFoodResults, setSlotFoodResults] = useState<Food[]>([]);
  const [savingMenu, setSavingMenu] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [menuRecommending, setMenuRecommending] = useState(false);
  // saveSlotPrompt: ask user to name + save a slot's foods as a new SavedMeal
  const [saveSlotPrompt, setSaveSlotPrompt] = useState<{ slotIdx: number; name: string } | null>(null);

  // ── Weekly Menu tab ──────────────────────────────────────────────────────────
  const [numDays, setNumDays] = useState(7);
  const [numPicks, setNumPicks] = useState(2);
  const [generatingWeekly, setGeneratingWeekly] = useState(false);
  const [weeklyResult, setWeeklyResult] = useState<WeeklyMenuOut | null>(null);
  const [weeklyError, setWeeklyError] = useState("");

  // ── Derived ──────────────────────────────────────────────────────────────────
  const foodById = useMemo(() => {
    const map = new Map<number, Food>();
    myFoods.forEach(uf => map.set(uf.food_id, uf.food));
    return map;
  }, [myFoods]);

  // ── Load shared data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    getMealCategories().then(setCategories).catch(() => {});
    getMyFoods(user.id).then(setMyFoods).catch(() => {});
  }, [user]);

  // Load tab-specific data
  const loadTabData = useCallback(() => {
    if (!user) return;
    setLoading(true);
    if (tab === "meals") {
      getSavedMeals(user.id)
        .then(setMeals)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (tab === "daily-menus") {
      Promise.all([
        getDailyMenus(user.id).catch(() => [] as DailyMenu[]),
        getSavedMeals(user.id).catch(() => [] as SavedMeal[]),
      ]).then(([menus, smeals]) => {
        setDailyMenus(menus as DailyMenu[]);
        setSavedMealsForMenu(smeals as SavedMeal[]);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, tab]);

  useEffect(() => { loadTabData(); }, [loadTabData]);

  // Debounced food search for meal picker
  useEffect(() => {
    if (mealFoodTab !== "all") { setMealFoodResults([]); return; }
    if (!mealFoodQuery.trim()) { setMealFoodResults([]); return; }
    const t = setTimeout(() => getFoods(mealFoodQuery).then(setMealFoodResults).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [mealFoodQuery, mealFoodTab]);

  // Debounced food search for slot picker
  useEffect(() => {
    if (slotFoodTab !== "all") { setSlotFoodResults([]); return; }
    if (!slotFoodQuery.trim()) { setSlotFoodResults([]); return; }
    const t = setTimeout(() => getFoods(slotFoodQuery).then(setSlotFoodResults).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [slotFoodQuery, slotFoodTab]);

  // ── Meals handlers ────────────────────────────────────────────────────────────

  const openNewMeal = () => {
    setSelectedMealId(null);
    setMealForm(emptyMealForm());
    setMealFoodTab("my-foods");
    setMealFoodQuery("");
    setMealFoodResults([]);
    setMealRecommendations(null);
    setMealError("");
    setCreatingMeal(true);
  };

  const openEditMeal = (meal: SavedMeal) => {
    setSelectedMealId(meal.id);
    setMealForm({
      name: meal.name,
      calorie_goal: String(meal.calorie_goal),
      category_ids: meal.meal_categories.map(c => c.id),
      entries: meal.items.map(i => ({ food: i.food, amount_g: i.amount_g })),
    });
    setMealFoodTab("my-foods");
    setMealFoodQuery("");
    setMealFoodResults([]);
    setMealRecommendations(null);
    setMealError("");
    setCreatingMeal(false);
  };

  const closeMealForm = () => {
    setCreatingMeal(false);
    setSelectedMealId(null);
    setMealRecommendations(null);
    setMealError("");
  };

  const toggleMealCategory = (catId: number) =>
    setMealForm(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(catId)
        ? prev.category_ids.filter(id => id !== catId)
        : [...prev.category_ids, catId],
    }));

  const addMealEntry = (food: Food) => {
    setMealForm(prev => ({
      ...prev,
      entries: prev.entries.find(e => e.food.id === food.id)
        ? prev.entries
        : [...prev.entries, { food, amount_g: food.serving_size || 100 }],
    }));
    setMealFoodQuery("");
    setMealFoodResults([]);
  };

  const updateMealAmount = (foodId: number, val: string) =>
    setMealForm(prev => ({
      ...prev,
      entries: prev.entries.map(e =>
        e.food.id === foodId ? { ...e, amount_g: parseFloat(val) || 0 } : e
      ),
    }));

  const removeMealEntry = (foodId: number) =>
    setMealForm(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.food.id !== foodId),
    }));

  const handleSaveMeal = async () => {
    if (!user || !mealForm.name.trim() || mealForm.entries.length === 0) return;
    setSavingMeal(true);
    setMealError("");
    try {
      const payload = {
        name: mealForm.name.trim(),
        calorie_goal: parseFloat(mealForm.calorie_goal) || 0,
        category_ids: mealForm.category_ids,
        items: mealForm.entries.map(e => ({ food_id: e.food.id, amount_g: e.amount_g })),
      };
      if (selectedMealId) {
        const updated = await updateSavedMeal(user.id, selectedMealId, payload);
        setMeals(prev => prev.map(m => m.id === selectedMealId ? updated : m));
      } else {
        const created = await createSavedMeal(user.id, payload);
        setMeals(prev => [created, ...prev]);
        setSelectedMealId(created.id);
        setCreatingMeal(false);
      }
    } catch {
      setMealError("Failed to save meal. Please try again.");
    } finally {
      setSavingMeal(false);
    }
  };

  const handleDeleteMeal = async (mealId: number) => {
    if (!user || !window.confirm("Delete this meal?")) return;
    await deleteSavedMeal(user.id, mealId).catch(() => {});
    setMeals(prev => prev.filter(m => m.id !== mealId));
    if (selectedMealId === mealId) closeMealForm();
  };

  const handleRecommendMeal = async () => {
    if (!user || mealForm.category_ids.length === 0) return;
    const calGoal = parseFloat(mealForm.calorie_goal) || 0;
    if (calGoal <= 0) {
      setMealError("Set a calorie goal before requesting recommendations.");
      return;
    }
    setMealRecommending(true);
    setMealError("");
    try {
      const result = await recommendSavedMeal(user.id, {
        category_ids: mealForm.category_ids,
        calorie_goal: calGoal,
      });
      setMealRecommendations(result.recommendations);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMealError(msg || "Failed to get recommendations.");
    } finally {
      setMealRecommending(false);
    }
  };

  const applyMealRecommendation = (rec: MealRecommendation) => {
    const entries: FoodEntry[] = [];
    for (const item of rec.items) {
      const food = foodById.get(item.food_id);
      if (food) entries.push({ food, amount_g: item.amount_g });
    }
    setMealForm(prev => ({ ...prev, name: rec.name || prev.name, entries }));
    setMealRecommendations(null);
  };

  // ── Daily Menu handlers ───────────────────────────────────────────────────────

  const openNewMenu = () => {
    setSelectedMenuId(null);
    setMenuForm({
      name: "",
      calorie_target: user?.calorie_goal ? String(Math.round(user.calorie_goal)) : "2000",
      slots: [],
    });
    setActiveSlotIdx(null);
    setMenuError("");
    setCreatingMenu(true);
  };

  const openEditMenu = (menu: DailyMenu) => {
    setSelectedMenuId(menu.id);
    setMenuForm({
      name: menu.name,
      calorie_target: String(menu.calorie_target),
      slots: menu.slots.map(s => ({
        category_id: s.category_id,
        slot_index: s.slot_index,
        calorie_pct: String(s.calorie_pct),
        saved_meal_id: s.saved_meal_id ?? null,
        entries: s.items.map(i => ({ food: i.food, amount_g: i.amount_g })),
      })),
    });
    setActiveSlotIdx(null);
    setMenuError("");
    setCreatingMenu(false);
  };

  const closeMenuForm = () => {
    setCreatingMenu(false);
    setSelectedMenuId(null);
    setActiveSlotIdx(null);
    setMenuError("");
  };

  const addMenuSlot = (categoryId: number) => {
    const existingCount = menuForm.slots.filter(s => s.category_id === categoryId).length;
    setMenuForm(prev => ({
      ...prev,
      slots: [
        ...prev.slots,
        {
          category_id: categoryId,
          slot_index: existingCount,
          calorie_pct: "",
          saved_meal_id: null,
          entries: [],
        },
      ],
    }));
  };

  const removeMenuSlot = (idx: number) => {
    setMenuForm(prev => ({ ...prev, slots: prev.slots.filter((_, i) => i !== idx) }));
    if (activeSlotIdx === idx) setActiveSlotIdx(null);
    else if (activeSlotIdx !== null && activeSlotIdx > idx)
      setActiveSlotIdx(prev => (prev !== null ? prev - 1 : null));
  };

  const updateSlotPct = (idx: number, val: string) =>
    setMenuForm(prev => ({
      ...prev,
      slots: prev.slots.map((s, i) => i === idx ? { ...s, calorie_pct: val } : s),
    }));

  const setSlotSavedMeal = (idx: number, mealId: number | null) =>
    setMenuForm(prev => ({
      ...prev,
      slots: prev.slots.map((s, i) =>
        i === idx ? { ...s, saved_meal_id: mealId, entries: mealId ? [] : s.entries } : s
      ),
    }));

  const toggleSlotFoodPicker = (idx: number) => {
    if (activeSlotIdx === idx) {
      setActiveSlotIdx(null);
    } else {
      setActiveSlotIdx(idx);
      setSlotFoodTab("my-foods");
      setSlotFoodQuery("");
      setSlotFoodResults([]);
    }
  };

  const addSlotEntry = (slotIdx: number, food: Food) => {
    setMenuForm(prev => ({
      ...prev,
      slots: prev.slots.map((s, i) => {
        if (i !== slotIdx) return s;
        if (s.entries.find(e => e.food.id === food.id)) return s;
        return { ...s, entries: [...s.entries, { food, amount_g: food.serving_size || 100 }] };
      }),
    }));
    setSlotFoodQuery("");
    setSlotFoodResults([]);
  };

  const updateSlotAmount = (slotIdx: number, foodId: number, val: string) =>
    setMenuForm(prev => ({
      ...prev,
      slots: prev.slots.map((s, i) =>
        i !== slotIdx ? s : {
          ...s,
          entries: s.entries.map(e =>
            e.food.id === foodId ? { ...e, amount_g: parseFloat(val) || 0 } : e
          ),
        }
      ),
    }));

  const removeSlotEntry = (slotIdx: number, foodId: number) =>
    setMenuForm(prev => ({
      ...prev,
      slots: prev.slots.map((s, i) =>
        i !== slotIdx ? s : { ...s, entries: s.entries.filter(e => e.food.id !== foodId) }
      ),
    }));

  const handleSaveMenu = async () => {
    if (!user || !menuForm.name.trim()) return;
    setSavingMenu(true);
    setMenuError("");
    try {
      const slotsPayload: SlotCreate[] = menuForm.slots
        .filter(s => s.category_id !== null)
        .map(s => ({
          category_id: s.category_id!,
          slot_index: s.slot_index,
          calorie_pct: parseFloat(s.calorie_pct) || 0,
          saved_meal_id: s.saved_meal_id ?? null,
          items: s.saved_meal_id
            ? []
            : s.entries.map(e => ({ food_id: e.food.id, amount_g: e.amount_g })),
        }));
      const payload = {
        name: menuForm.name.trim(),
        calorie_target: parseFloat(menuForm.calorie_target) || 2000,
        slots: slotsPayload,
      };
      if (selectedMenuId) {
        const updated = await updateDailyMenu(user.id, selectedMenuId, payload);
        setDailyMenus(prev => prev.map(m => m.id === selectedMenuId ? updated : m));
      } else {
        const created = await createDailyMenu(user.id, payload);
        setDailyMenus(prev => [created, ...prev]);
        setSelectedMenuId(created.id);
        setCreatingMenu(false);
      }
    } catch {
      setMenuError("Failed to save daily menu. Please try again.");
    } finally {
      setSavingMenu(false);
    }
  };

  const handleDeleteMenu = async (menuId: number) => {
    if (!user || !window.confirm("Delete this daily menu?")) return;
    await deleteDailyMenu(user.id, menuId).catch(() => {});
    setDailyMenus(prev => prev.filter(m => m.id !== menuId));
    if (selectedMenuId === menuId) closeMenuForm();
  };

  const handleRecommendMenu = async () => {
    if (!user) return;
    const calTarget = parseFloat(menuForm.calorie_target) || 0;
    if (calTarget <= 0) {
      setMenuError("Set a calorie target before requesting recommendations.");
      return;
    }
    const slotsSpec = menuForm.slots
      .filter(s => s.category_id !== null && s.calorie_pct !== "")
      .map(s => ({
        category_id: s.category_id!,
        slot_index: s.slot_index,
        calorie_pct: parseFloat(s.calorie_pct) || 0,
      }));
    if (slotsSpec.length === 0) {
      setMenuError("Add at least one slot with a calorie % before requesting recommendations.");
      return;
    }
    setMenuRecommending(true);
    setMenuError("");
    try {
      const result = await recommendDailyMenu(user.id, { calorie_target: calTarget, slots: slotsSpec });
      // Apply recommendation to slots
      setMenuForm(prev => ({
        ...prev,
        slots: prev.slots.map(slot => {
          if (slot.category_id === null) return slot;
          const recSlot = (result as DailyMenuRecommendationOut).slots.find(
            rs => rs.category_id === slot.category_id && rs.slot_index === slot.slot_index
          );
          if (!recSlot) return slot;
          if (recSlot.saved_meal_id) {
            return { ...slot, saved_meal_id: recSlot.saved_meal_id, entries: [] };
          }
          const entries: FoodEntry[] = [];
          for (const item of recSlot.items) {
            const food = foodById.get(item.food_id);
            if (food) entries.push({ food, amount_g: item.amount_g });
          }
          return { ...slot, saved_meal_id: null, entries };
        }),
      }));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMenuError(msg || "Failed to get recommendations.");
    } finally {
      setMenuRecommending(false);
    }
  };

  const handleSaveSlotAsMeal = async () => {
    if (!user || !saveSlotPrompt) return;
    const slot = menuForm.slots[saveSlotPrompt.slotIdx];
    if (!slot || slot.entries.length === 0) { setSaveSlotPrompt(null); return; }
    try {
      const cat = categories.find(c => c.id === slot.category_id);
      const created = await createSavedMeal(user.id, {
        name: saveSlotPrompt.name.trim() || (cat ? `${cat.name} meal` : "Untitled"),
        calorie_goal: parseFloat(menuForm.calorie_target) * (parseFloat(slot.calorie_pct) / 100) || 0,
        category_ids: slot.category_id ? [slot.category_id] : [],
        items: slot.entries.map(e => ({ food_id: e.food.id, amount_g: e.amount_g })),
      });
      setSavedMealsForMenu(prev => [created, ...prev]);
      // Link the slot to the newly saved meal
      setSlotSavedMeal(saveSlotPrompt.slotIdx, created.id);
    } catch { /* ignore */ }
    setSaveSlotPrompt(null);
  };

  // ── Weekly Menu handler ───────────────────────────────────────────────────────

  const handleGenerateWeekly = async () => {
    if (!user) return;
    setGeneratingWeekly(true);
    setWeeklyError("");
    setWeeklyResult(null);
    try {
      const result = await generateWeeklyMenu(user.id, { num_days: numDays, num_picks: numPicks });
      setWeeklyResult(result);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setWeeklyError(msg || "Failed to generate weekly menu.");
    } finally {
      setGeneratingWeekly(false);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────────

  const pctSum = menuForm.slots.reduce((s, slot) => s + (parseFloat(slot.calorie_pct) || 0), 0);
  const mealFormValid = mealForm.name.trim() !== "" && mealForm.entries.length > 0;
  const menuFormValid = menuForm.name.trim() !== "";

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page title */}
      <h2 className="text-2xl font-bold">Meal Planner</h2>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["meals", "daily-menus", "weekly"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
              tab === t
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {t === "meals" ? "Meals" : t === "daily-menus" ? "Daily Menus" : "Weekly Menu"}
          </button>
        ))}
      </div>

      {/* ── MEALS TAB ─────────────────────────────────────────────────────────── */}
      {tab === "meals" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: meals list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Saved Meals</h3>
              <button onClick={openNewMeal} className="btn-primary py-1 px-2 text-xs">
                <Plus size={13} /> New
              </button>
            </div>

            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : meals.length === 0 ? (
              <div className="card text-center text-gray-400 text-sm py-8">
                No meals yet. Create one!
              </div>
            ) : (
              meals.map(meal => (
                <div
                  key={meal.id}
                  onClick={() => openEditMeal(meal)}
                  className={[
                    "card cursor-pointer transition-all p-4",
                    selectedMealId === meal.id
                      ? "ring-2 ring-primary-500 border-primary-200"
                      : "hover:border-gray-300",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{meal.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Goal: {Math.round(meal.calorie_goal)} kcal &bull; Actual: {Math.round(meal.total_calories)} kcal
                      </p>
                      {meal.meal_categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {meal.meal_categories.map(c => (
                            <span
                              key={c.id}
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: c.color + "20", color: c.color }}
                            >
                              {c.emoji} {c.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteMeal(meal.id); }}
                      className="p-1 text-red-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right panel: meal edit form */}
          <div className="md:col-span-2">
            {!creatingMeal && selectedMealId === null ? (
              <div className="card text-center text-gray-400 py-16">
                Select a meal or create a new one.
              </div>
            ) : (
              <div className="card space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{selectedMealId ? "Edit Meal" : "New Meal"}</h3>
                  <button onClick={closeMealForm} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>

                {/* Name + calorie goal */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label">Meal Name *</label>
                    <input
                      className="input"
                      value={mealForm.name}
                      onChange={e => setMealForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Morning protein bowl"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label">Calorie Goal (kcal)</label>
                    <input
                      type="number"
                      className="input"
                      value={mealForm.calorie_goal}
                      onChange={e => setMealForm(p => ({ ...p, calorie_goal: e.target.value }))}
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="label">Meal Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => {
                      const active = mealForm.category_ids.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleMealCategory(cat.id)}
                          className={[
                            "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1",
                            active
                              ? "text-white border-transparent"
                              : "bg-white text-gray-700 border-gray-300 hover:border-primary-400",
                          ].join(" ")}
                          style={active ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                        >
                          {active && <Check size={12} />}
                          {cat.emoji} {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Current food entries */}
                {mealForm.entries.length > 0 && (
                  <div>
                    <label className="label">Foods in this Meal</label>
                    <EntryList
                      entries={mealForm.entries}
                      onUpdateAmount={updateMealAmount}
                      onRemove={removeMealEntry}
                    />
                  </div>
                )}

                {/* Food picker */}
                <div>
                  <label className="label">Add Food</label>
                  <FoodPicker
                    myFoods={myFoods}
                    foodTab={mealFoodTab}
                    setFoodTab={t => { setMealFoodTab(t); setMealFoodQuery(""); setMealFoodResults([]); }}
                    foodQuery={mealFoodQuery}
                    setFoodQuery={setMealFoodQuery}
                    foodResults={mealFoodResults}
                    onAdd={addMealEntry}
                  />
                </div>

                {/* AI Recommendations */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">AI Recommendations</p>
                      <p className="text-xs text-gray-400">
                        Get 3 meal suggestions from your My Foods based on your categories and calorie goal.
                      </p>
                    </div>
                    <button
                      onClick={handleRecommendMeal}
                      disabled={mealRecommending || mealForm.category_ids.length === 0}
                      className="btn-secondary text-sm disabled:opacity-50 shrink-0"
                    >
                      <Sparkles size={14} />
                      {mealRecommending ? "Asking AI..." : "Get Recommendations"}
                    </button>
                  </div>

                  {mealRecommendations && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Pick a recommendation to fill the meal:
                      </p>
                      {mealRecommendations.map((rec, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">{rec.name}</p>
                            <span className="text-xs text-gray-400 shrink-0">
                              ~{Math.round(rec.estimated_calories)} kcal
                            </span>
                          </div>
                          <ul className="text-xs text-gray-500 space-y-0.5">
                            {rec.items.map((item, j) => {
                              const food = foodById.get(item.food_id);
                              return (
                                <li key={j}>
                                  {food ? food.name : `Food #${item.food_id}`} — {item.amount_g}g
                                </li>
                              );
                            })}
                          </ul>
                          <button
                            onClick={() => applyMealRecommendation(rec)}
                            className="btn-primary text-xs py-1 px-3 mt-1"
                          >
                            Use this
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setMealRecommendations(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>

                {mealError && <p className="text-red-500 text-sm">{mealError}</p>}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button onClick={closeMealForm} className="btn-secondary flex-1 justify-center">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMeal}
                    disabled={savingMeal || !mealFormValid}
                    className="btn-primary flex-1 justify-center disabled:opacity-50"
                  >
                    {savingMeal ? "Saving..." : "Save Meal"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DAILY MENUS TAB ───────────────────────────────────────────────────── */}
      {tab === "daily-menus" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: daily menus list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Daily Menus</h3>
              <button onClick={openNewMenu} className="btn-primary py-1 px-2 text-xs">
                <Plus size={13} /> New
              </button>
            </div>

            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : dailyMenus.length === 0 ? (
              <div className="card text-center text-gray-400 text-sm py-8">
                No daily menus yet. Create one!
              </div>
            ) : (
              dailyMenus.map(menu => (
                <div
                  key={menu.id}
                  onClick={() => openEditMenu(menu)}
                  className={[
                    "card cursor-pointer transition-all p-4",
                    selectedMenuId === menu.id
                      ? "ring-2 ring-primary-500 border-primary-200"
                      : "hover:border-gray-300",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{menu.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Target: {Math.round(menu.calorie_target)} kcal
                        {menu.total_calories > 0 && ` · Actual: ${Math.round(menu.total_calories)} kcal`}
                      </p>
                      <p className="text-xs text-gray-400">{menu.slots.length} slot(s)</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteMenu(menu.id); }}
                      className="p-1 text-red-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right panel: menu edit form */}
          <div className="md:col-span-2">
            {!creatingMenu && selectedMenuId === null ? (
              <div className="card text-center text-gray-400 py-16">
                Select a daily menu or create a new one.
              </div>
            ) : (
              <div className="card space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{selectedMenuId ? "Edit Daily Menu" : "New Daily Menu"}</h3>
                  <button onClick={closeMenuForm} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>

                {/* Name + calorie target */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label">Menu Name *</label>
                    <input
                      className="input"
                      value={menuForm.name}
                      onChange={e => setMenuForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. My Weekday Plan"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label">Total Calorie Target (kcal)</label>
                    <input
                      type="number"
                      className="input"
                      value={menuForm.calorie_target}
                      onChange={e => setMenuForm(p => ({ ...p, calorie_target: e.target.value }))}
                      placeholder="2000"
                    />
                  </div>
                </div>

                {/* Add slot */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Meal Slots</label>
                    <div className="flex items-center gap-3">
                      <span className={[
                        "text-xs font-medium",
                        Math.abs(pctSum - 100) < 0.5 ? "text-green-600" : pctSum > 100 ? "text-red-500" : "text-gray-400",
                      ].join(" ")}>
                        {Math.round(pctSum)}% / 100%
                      </span>
                    </div>
                  </div>

                  {/* Add slot dropdown */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => addMenuSlot(cat.id)}
                        className="px-2 py-1 text-xs rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center gap-1"
                      >
                        <Plus size={11} /> {cat.emoji} {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Slots list */}
                  {menuForm.slots.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Add meal slots by clicking the category buttons above.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {menuForm.slots.map((slot, idx) => {
                        const cat = categories.find(c => c.id === slot.category_id);
                        const slotCals = Math.round(
                          (parseFloat(menuForm.calorie_target) || 0) * (parseFloat(slot.calorie_pct) || 0) / 100
                        );
                        const assignedMeal = savedMealsForMenu.find(m => m.id === slot.saved_meal_id);
                        const isPickerOpen = activeSlotIdx === idx;

                        return (
                          <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3">
                            {/* Slot header */}
                            <div className="flex items-center gap-3 flex-wrap">
                              {cat && (
                                <span
                                  className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color + "20", color: cat.color }}
                                >
                                  {cat.emoji} {cat.name}
                                  {slot.slot_index > 0 && ` #${slot.slot_index + 1}`}
                                </span>
                              )}
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={slot.calorie_pct}
                                  onChange={e => updateSlotPct(idx, e.target.value)}
                                  className="w-16 input py-1 text-sm text-right"
                                  placeholder="30"
                                />
                                <span className="text-sm text-gray-500">%</span>
                                {slotCals > 0 && (
                                  <span className="text-xs text-gray-400 ml-1">({slotCals} kcal)</span>
                                )}
                              </div>
                              <button
                                onClick={() => removeMenuSlot(idx)}
                                className="ml-auto p-1 text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Slot source: saved meal or custom foods */}
                            <div className="flex gap-2 text-xs">
                              <button
                                onClick={() => setSlotSavedMeal(idx, null)}
                                className={[
                                  "px-2 py-1 rounded border transition-colors",
                                  slot.saved_meal_id === null
                                    ? "bg-primary-50 border-primary-300 text-primary-700"
                                    : "border-gray-200 text-gray-500 hover:border-gray-300",
                                ].join(" ")}
                              >
                                Custom Foods
                              </button>
                              <button
                                onClick={() => {
                                  if (savedMealsForMenu.length === 0) return;
                                  setSlotSavedMeal(idx, savedMealsForMenu[0].id);
                                }}
                                className={[
                                  "px-2 py-1 rounded border transition-colors",
                                  slot.saved_meal_id !== null
                                    ? "bg-primary-50 border-primary-300 text-primary-700"
                                    : "border-gray-200 text-gray-500 hover:border-gray-300",
                                ].join(" ")}
                              >
                                Saved Meal
                              </button>
                            </div>

                            {/* Saved meal selector */}
                            {slot.saved_meal_id !== null && (
                              <div>
                                <select
                                  value={slot.saved_meal_id ?? ""}
                                  onChange={e => setSlotSavedMeal(idx, Number(e.target.value) || null)}
                                  className="input text-sm"
                                >
                                  <option value="">— Select a saved meal —</option>
                                  {savedMealsForMenu
                                    .filter(m =>
                                      cat ? m.meal_categories.some(mc => mc.id === cat.id) : true
                                    )
                                    .map(m => (
                                      <option key={m.id} value={m.id}>
                                        {m.name} (~{Math.round(m.total_calories)} kcal)
                                      </option>
                                    ))
                                  }
                                  {savedMealsForMenu.filter(m =>
                                    cat ? m.meal_categories.some(mc => mc.id === cat.id) : true
                                  ).length === 0 && (
                                    <option disabled>No meals for this category</option>
                                  )}
                                </select>
                                {assignedMeal && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {assignedMeal.items.length} food(s) · {Math.round(assignedMeal.total_calories)} kcal actual
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Custom foods for this slot */}
                            {slot.saved_meal_id === null && (
                              <div className="space-y-2">
                                <EntryList
                                  entries={slot.entries}
                                  onUpdateAmount={(fid, val) => updateSlotAmount(idx, fid, val)}
                                  onRemove={fid => removeSlotEntry(idx, fid)}
                                />

                                {/* "Save as new Meal" button */}
                                {slot.entries.length > 0 && (
                                  <div>
                                    {saveSlotPrompt?.slotIdx === idx ? (
                                      <div className="flex gap-2 items-center">
                                        <input
                                          className="input text-sm flex-1"
                                          placeholder="Meal name..."
                                          value={saveSlotPrompt.name}
                                          onChange={e => setSaveSlotPrompt(p => p ? { ...p, name: e.target.value } : p)}
                                          autoFocus
                                        />
                                        <button onClick={handleSaveSlotAsMeal} className="btn-primary text-xs py-1 px-2">
                                          Save
                                        </button>
                                        <button onClick={() => setSaveSlotPrompt(null)} className="text-gray-400 hover:text-gray-600">
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setSaveSlotPrompt({ slotIdx: idx, name: cat ? cat.name + " meal" : "" })}
                                        className="text-xs text-primary-600 hover:text-primary-800 underline"
                                      >
                                        Save foods as a new Meal
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Food picker toggle */}
                                <button
                                  onClick={() => toggleSlotFoodPicker(idx)}
                                  className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                                >
                                  {isPickerOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  {isPickerOpen ? "Close food picker" : "Add food"}
                                </button>

                                {/* Food picker */}
                                {isPickerOpen && (
                                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                    <FoodPicker
                                      myFoods={myFoods}
                                      foodTab={slotFoodTab}
                                      setFoodTab={t => { setSlotFoodTab(t); setSlotFoodQuery(""); setSlotFoodResults([]); }}
                                      foodQuery={slotFoodQuery}
                                      setFoodQuery={setSlotFoodQuery}
                                      foodResults={slotFoodResults}
                                      onAdd={food => addSlotEntry(idx, food)}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* AI Recommendations */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">AI Recommendations</p>
                      <p className="text-xs text-gray-400">
                        Gemini will suggest foods for each slot based on your My Foods and calorie targets.
                      </p>
                    </div>
                    <button
                      onClick={handleRecommendMenu}
                      disabled={menuRecommending || menuForm.slots.length === 0}
                      className="btn-secondary text-sm disabled:opacity-50 shrink-0"
                    >
                      <Sparkles size={14} />
                      {menuRecommending ? "Asking AI..." : "Get Recommendations"}
                    </button>
                  </div>
                </div>

                {menuError && <p className="text-red-500 text-sm">{menuError}</p>}

                {/* Calorie % warning */}
                {menuForm.slots.length > 0 && Math.abs(pctSum - 100) > 0.5 && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    Calorie percentages sum to {Math.round(pctSum)}%. Adjust them to reach 100%.
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button onClick={closeMenuForm} className="btn-secondary flex-1 justify-center">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMenu}
                    disabled={savingMenu || !menuFormValid}
                    className="btn-primary flex-1 justify-center disabled:opacity-50"
                  >
                    {savingMenu ? "Saving..." : "Save Daily Menu"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WEEKLY MENU TAB ───────────────────────────────────────────────────── */}
      {tab === "weekly" && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Generate Weekly Menu</h3>
              <p className="text-sm text-gray-500">
                Randomly assign your saved Daily Menus across a number of days. The result is for
                inspiration only and is not saved.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Number of Days</label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  className="input"
                  value={numDays}
                  onChange={e => setNumDays(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div>
                <label className="label">Different Menus to Use</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="input"
                  value={numPicks}
                  onChange={e => setNumPicks(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <p className="text-xs text-gray-400 mt-1">
                  e.g. 2 = the week alternates between 2 different daily menus
                </p>
              </div>
            </div>

            {weeklyError && <p className="text-red-500 text-sm">{weeklyError}</p>}

            <button
              onClick={handleGenerateWeekly}
              disabled={generatingWeekly}
              className="btn-primary disabled:opacity-50"
            >
              <Sparkles size={15} />
              {generatingWeekly ? "Generating..." : "Generate Weekly Menu"}
            </button>
          </div>

          {/* Weekly result */}
          {weeklyResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Your {weeklyResult.days.length}-Day Menu
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({weeklyResult.num_picks} distinct menu{weeklyResult.num_picks > 1 ? "s" : ""})
                  </span>
                </h3>
                <button
                  onClick={() => setWeeklyResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {weeklyResult.days.map(dayEntry => {
                  const dayLabel = numDays <= 7
                    ? DAY_NAMES[(dayEntry.day - 1) % 7]
                    : `Day ${dayEntry.day}`;
                  const menu = dayEntry.daily_menu;
                  return (
                    <div key={dayEntry.day} className="card p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        {dayLabel}
                      </p>
                      <p className="font-medium text-sm mb-2 truncate">{menu.name}</p>
                      <p className="text-xs text-gray-400 mb-2">
                        {Math.round(menu.calorie_target)} kcal target
                      </p>
                      {menu.slots.length > 0 && (
                        <div className="space-y-1">
                          {menu.slots.map((slot, si) => {
                            const slotCal = Math.round(
                              menu.calorie_target * slot.calorie_pct / 100
                            );
                            return (
                              <div key={si} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">
                                  {slot.category.emoji} {slot.category.name}
                                  {slot.slot_index > 0 && ` #${slot.slot_index + 1}`}
                                </span>
                                <span className="text-gray-400">{slotCal} kcal</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend: which menus were used */}
              <div className="card p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Menus Used This Week
                </p>
                <div className="space-y-2">
                  {weeklyResult.daily_menu_ids_used.map(id => {
                    const menu = dailyMenus.find(m => m.id === id);
                    if (!menu) return null;
                    const assignedDays = weeklyResult.days
                      .filter(d => d.daily_menu.id === id)
                      .map(d => numDays <= 7 ? DAY_NAMES[(d.day - 1) % 7] : `Day ${d.day}`)
                      .join(", ");
                    return (
                      <div key={id} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{menu.name}</span>
                        <span className="text-xs text-gray-400">{assignedDays}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
