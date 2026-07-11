import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  createMealLog, deleteMealLog, getDailySummary,
  getFoods, getMealCategories,
} from "../services/api";
import MacroBar from "../components/MacroBar";
import type { DailySummary, Food, MealCategory } from "../types";

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface Entry { food: Food; amount_g: number }

export default function DailyLog() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Add-meal form state
  const [showForm, setShowForm] = useState(false);
  const [selCat, setSelCat] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getDailySummary(user.id, fmtDate(date))
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [user, date]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { getMealCategories().then(setCategories).catch(() => {}); }, []);

  const shiftDay = (n: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d);
  };

  // Debounced food search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => getFoods(query).then(setResults).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [query]);

  const addEntry = (food: Food) => {
    setEntries((prev) => prev.find((e) => e.food.id === food.id)
      ? prev
      : [...prev, { food, amount_g: food.serving_size || 100 }]);
    setQuery("");
    setResults([]);
  };

  const updateAmount = (id: number, val: string) =>
    setEntries((prev) =>
      prev.map((e) => (e.food.id === id ? { ...e, amount_g: parseFloat(val) || 0 } : e))
    );

  const removeEntry = (id: number) =>
    setEntries((prev) => prev.filter((e) => e.food.id !== id));

  const resetForm = () => {
    setShowForm(false);
    setEntries([]);
    setNote("");
    setSelCat(null);
    setQuery("");
    setResults([]);
    setError("");
  };

  const handleSave = async () => {
    if (!user || !selCat || entries.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await createMealLog(user.id, {
        date: fmtDate(date),
        category_id: selCat,
        note: note || undefined,
        items: entries.map((e) => ({ food_id: e.food.id, amount_g: e.amount_g })),
      });
      resetForm();
      loadSummary();
    } catch {
      setError("Failed to save meal. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (logId: number) => {
    if (!user) return;
    await deleteMealLog(user.id, logId).catch(() => {});
    loadSummary();
  };

  return (
    <div className="space-y-6">
      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDay(-1)} className="btn-secondary p-2">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-lg font-bold leading-tight">
            {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h2>
          <input
            type="date"
            value={fmtDate(date)}
            onChange={(e) => setDate(new Date(e.target.value + "T12:00:00"))}
            className="text-xs text-gray-400 border-none bg-transparent text-center cursor-pointer mt-0.5"
          />
        </div>
        <button onClick={() => shiftDay(1)} className="btn-secondary p-2">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Macro summary */}
      {summary && (
        <MacroBar
          calories={summary.total_calories}
          protein={summary.total_protein_g}
          carbs={summary.total_carbs_g}
          fat={summary.total_fat_g}
          goalCalories={user?.calorie_goal}
          goalProtein={user?.protein_goal_g}
          goalCarbs={user?.carbs_goal_g}
          goalFat={user?.fat_goal_g}
        />
      )}

      {/* Logged meals */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : summary && summary.meals.length > 0 ? (
        <div className="space-y-3">
          {summary.meals.map((meal) => (
            <div key={meal.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">
                  {meal.category.emoji} {meal.category.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {Math.round(meal.total_calories)} kcal
                  </span>
                  <button
                    onClick={() => handleDelete(meal.id)}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {meal.note && (
                <p className="text-xs text-gray-400 mb-2 italic">{meal.note}</p>
              )}

              <div className="divide-y divide-gray-50">
                {meal.items.map((item) => (
                  <div key={item.id} className="py-1.5 flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.food.name}</span>
                    <div className="text-xs text-gray-400 text-right space-x-2">
                      <span>{item.amount_g}g</span>
                      <span>{Math.round(item.calories)} kcal</span>
                      <span className="hidden sm:inline">
                        P:{Math.round(item.protein_g)}g
                        C:{Math.round(item.carbs_g)}g
                        F:{Math.round(item.fat_g)}g
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-400 flex gap-4">
                <span>P: {Math.round(meal.total_protein_g)}g</span>
                <span>C: {Math.round(meal.total_carbs_g)}g</span>
                <span>F: {Math.round(meal.total_fat_g)}g</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="card text-center text-gray-400 py-8">
            No meals logged for this day.
          </div>
        )
      )}

      {/* Add meal button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full justify-center">
          <Plus size={18} /> Add Meal
        </button>
      )}

      {/* Add meal form */}
      {showForm && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Add Meal</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {/* Category selector */}
          <div>
            <label className="label">Meal Category *</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelCat(cat.id)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                    selCat === cat.id
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-primary-400",
                  ].join(" ")}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Food search */}
          <div>
            <label className="label">Search &amp; Add Foods</label>
            <input
              className="input"
              placeholder="Search food database..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {results.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
                {results.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => addEntry(food)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm transition-colors"
                  >
                    <span className="font-medium">{food.name}</span>
                    {food.brand && (
                      <span className="text-gray-400 ml-1 text-xs">({food.brand})</span>
                    )}
                    <span className="text-gray-400 ml-2 text-xs">
                      {Math.round(food.calories_per_serving)} kcal/{food.serving_size}{food.serving_unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected entries */}
          {entries.length > 0 && (
            <div>
              <label className="label">Selected Foods</label>
              <div className="space-y-2">
                {entries.map((e) => (
                  <div key={e.food.id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm truncate">{e.food.name}</span>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={e.amount_g}
                      onChange={(ev) => updateAmount(e.food.id, ev.target.value)}
                      className="w-20 input text-right py-1"
                    />
                    <span className="text-xs text-gray-400 w-4">g</span>
                    <span className="text-xs text-gray-400 w-16 text-right shrink-0">
                      {Math.round((e.food.calories_per_serving * e.amount_g) / (e.food.serving_size || 100))} kcal
                    </span>
                    <button
                      onClick={() => removeEntry(e.food.id)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="label">Note (optional)</label>
            <input
              className="input"
              placeholder="e.g. homemade, restaurant"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={resetForm} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selCat || entries.length === 0}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Meal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
