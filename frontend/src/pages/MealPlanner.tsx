import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  createMealPlan, deleteMealPlan,
  getFoods, getMealCategories, getMealPlans, getMyFoods,
} from "../services/api";
import type { Food, MealCategory, MealPlan, UserFood } from "../types";

export default function MealPlanner() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [selected, setSelected] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "", calorie_target: "",
    protein_target_g: "", carbs_target_g: "", fat_target_g: "", note: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Per-category food search
  const [catQuery, setCatQuery] = useState<Record<number, string>>({});
  const [catResults, setCatResults] = useState<Record<number, Food[]>>({});
  // Per-category tab: "my-foods" | "all"
  const [catTab, setCatTab] = useState<Record<number, "my-foods" | "all">>({});
  const [myFoods, setMyFoods] = useState<UserFood[]>([]);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getMealPlans(user.id).catch(() => [] as MealPlan[]),
      getMealCategories().catch(() => [] as MealCategory[]),
    ]).then(([p, c]) => {
      setPlans(p as MealPlan[]);
      setCategories(c as MealCategory[]);
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Load My Foods once (user context is stable)
  useEffect(() => {
    if (!user) return;
    getMyFoods(user.id).then(setMyFoods).catch(() => {});
  }, [user]);

  const snp = (field: string, val: string) =>
    setNewPlan((p) => ({ ...p, [field]: val }));

  const resetForm = () => {
    setShowNewForm(false);
    setNewPlan({ name: "", calorie_target: "", protein_target_g: "", carbs_target_g: "", fat_target_g: "", note: "" });
    setError("");
  };

  const handleCreate = async () => {
    if (!user || !newPlan.name || !newPlan.calorie_target) return;
    setCreating(true);
    setError("");
    try {
      const created = await createMealPlan(user.id, {
        name: newPlan.name,
        calorie_target: parseFloat(newPlan.calorie_target),
        protein_target_g: newPlan.protein_target_g ? parseFloat(newPlan.protein_target_g) : undefined,
        carbs_target_g: newPlan.carbs_target_g ? parseFloat(newPlan.carbs_target_g) : undefined,
        fat_target_g: newPlan.fat_target_g ? parseFloat(newPlan.fat_target_g) : undefined,
        note: newPlan.note || undefined,
        items: [],
      });
      setPlans((p) => [...p, created]);
      setSelected(created);
      resetForm();
    } catch {
      setError("Failed to create plan.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (planId: number) => {
    if (!user || !window.confirm("Delete this plan?")) return;
    await deleteMealPlan(user.id, planId).catch(() => {});
    setPlans((p) => p.filter((x) => x.id !== planId));
    if (selected?.id === planId) setSelected(null);
  };

  const getCatTab = (catId: number) => catTab[catId] ?? "my-foods";

  const setCatTabFor = (catId: number, tab: "my-foods" | "all") => {
    setCatTab((p) => ({ ...p, [catId]: tab }));
    setCatQuery((p) => ({ ...p, [catId]: "" }));
    setCatResults((p) => ({ ...p, [catId]: [] }));
  };

  const searchCat = async (catId: number, q: string) => {
    setCatQuery((p) => ({ ...p, [catId]: q }));
    if (getCatTab(catId) !== "all") { setCatResults((p) => ({ ...p, [catId]: [] })); return; }
    if (!q.trim()) { setCatResults((p) => ({ ...p, [catId]: [] })); return; }
    const results = await getFoods(q).catch(() => [] as Food[]);
    setCatResults((p) => ({ ...p, [catId]: results as Food[] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Meal Planner</h2>
        <button onClick={() => setShowNewForm(true)} className="btn-primary">
          <Plus size={16} /> New Plan
        </button>
      </div>

      {/* New plan form */}
      {showNewForm && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Create New Plan</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Plan Name *</label>
              <input
                className="input"
                value={newPlan.name}
                onChange={(e) => snp("name", e.target.value)}
                placeholder="e.g. Cut Phase, Bulk Plan"
              />
            </div>
            <div>
              <label className="label">Calorie Target *</label>
              <input
                type="number"
                className="input"
                value={newPlan.calorie_target}
                onChange={(e) => snp("calorie_target", e.target.value)}
                placeholder="2000"
              />
            </div>
            <div>
              <label className="label">Protein Target (g)</label>
              <input
                type="number"
                className="input"
                value={newPlan.protein_target_g}
                onChange={(e) => snp("protein_target_g", e.target.value)}
                placeholder="150"
              />
            </div>
            <div>
              <label className="label">Carbs Target (g)</label>
              <input
                type="number"
                className="input"
                value={newPlan.carbs_target_g}
                onChange={(e) => snp("carbs_target_g", e.target.value)}
                placeholder="200"
              />
            </div>
            <div>
              <label className="label">Fat Target (g)</label>
              <input
                type="number"
                className="input"
                value={newPlan.fat_target_g}
                onChange={(e) => snp("fat_target_g", e.target.value)}
                placeholder="70"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Note</label>
              <input
                className="input"
                value={newPlan.note}
                onChange={(e) => snp("note", e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={resetForm} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newPlan.name || !newPlan.calorie_target}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Plan"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plans list */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">
            Saved Plans
          </h3>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : plans.length === 0 ? (
            <div className="card text-center text-gray-400 text-sm py-8">
              No plans yet. Create one above.
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelected(plan)}
                className={[
                  "card cursor-pointer transition-all",
                  selected?.id === plan.id
                    ? "border-primary-400 bg-primary-50 shadow-none"
                    : "hover:border-gray-300",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{plan.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Target: {plan.calorie_target} kcal
                    </p>
                    <p className="text-xs text-gray-400">
                      Planned: {Math.round(plan.total_calories)} kcal
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <ChevronRight size={16} className="text-gray-300" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Plan detail */}
        <div className="md:col-span-2 space-y-4">
          {!selected ? (
            <div className="card flex items-center justify-center text-gray-400 text-sm h-48">
              Select a plan to view details
            </div>
          ) : (
            <>
              {/* Plan summary */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{selected.name}</h3>
                  {selected.note && (
                    <span className="text-xs text-gray-400">{selected.note}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Cal Target", value: `${selected.calorie_target}` },
                    { label: "Cal Planned", value: `${Math.round(selected.total_calories)}` },
                    { label: "Protein", value: `${Math.round(selected.total_protein_g)}g` },
                    { label: "Carbs", value: `${Math.round(selected.total_carbs_g)}g` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items by category */}
              {categories.map((cat) => {
                const items = selected.items.filter((i) => i.category_id === cat.id);
                const q = catQuery[cat.id] || "";
                const res = catResults[cat.id] || [];
                return (
                  <div key={cat.id} className="card">
                    <h4 className="font-medium mb-3">
                      {cat.emoji} {cat.name}
                    </h4>

                    {items.length > 0 ? (
                      <div className="divide-y divide-gray-50 mb-3">
                        {items.map((item) => (
                          <div key={item.id} className="py-1.5 flex items-center justify-between text-sm">
                            <span className="text-gray-700">{item.food.name}</span>
                            <div className="text-xs text-gray-400 flex gap-2">
                              <span>{item.amount_g}g</span>
                              <span>{Math.round(item.calories)} kcal</span>
                              <span>P:{Math.round(item.protein_g)}g</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mb-3">No foods planned for this meal</p>
                    )}

                    {/* Food search — tabbed */}
                    <div className="flex gap-1 mb-1.5 border-b border-gray-200">
                      {(["my-foods", "all"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setCatTabFor(cat.id, tab)}
                          className={[
                            "px-2.5 py-1 text-xs font-medium -mb-px border-b-2 transition-colors",
                            getCatTab(cat.id) === tab
                              ? "border-primary-600 text-primary-700"
                              : "border-transparent text-gray-400 hover:text-gray-600",
                          ].join(" ")}
                        >
                          {tab === "my-foods" ? "My Foods" : "All Foods"}
                        </button>
                      ))}
                    </div>
                    <input
                      className="input text-sm"
                      placeholder={getCatTab(cat.id) === "my-foods" ? "Filter My Foods..." : "Search food database..."}
                      value={q}
                      onChange={(e) => searchCat(cat.id, e.target.value)}
                    />
                    {/* My Foods results */}
                    {getCatTab(cat.id) === "my-foods" && (
                      <div className="border border-gray-200 rounded-lg mt-1 max-h-36 overflow-y-auto divide-y divide-gray-50">
                        {myFoods.filter((uf) =>
                          !q.trim() ||
                          uf.food.name.toLowerCase().includes(q.toLowerCase()) ||
                          (uf.food.brand ?? "").toLowerCase().includes(q.toLowerCase())
                        ).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-gray-400 text-center">
                            {myFoods.length === 0 ? "No foods in My Foods yet." : "No matching foods."}
                          </p>
                        ) : (
                          myFoods
                            .filter((uf) =>
                              !q.trim() ||
                              uf.food.name.toLowerCase().includes(q.toLowerCase()) ||
                              (uf.food.brand ?? "").toLowerCase().includes(q.toLowerCase())
                            )
                            .slice(0, 8)
                            .map((uf) => (
                              <div
                                key={uf.food_id}
                                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex justify-between"
                              >
                                <span>{uf.food.name}{uf.food.brand ? ` (${uf.food.brand})` : ""}</span>
                                <span className="text-gray-400">
                                  {Math.round(uf.food.calories_per_serving)} kcal/{uf.food.serving_size}{uf.food.serving_unit}
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    )}
                    {/* All Foods results */}
                    {getCatTab(cat.id) === "all" && res.length > 0 && (
                      <div className="border border-gray-200 rounded-lg mt-1 max-h-36 overflow-y-auto divide-y divide-gray-50">
                        {res.slice(0, 8).map((food) => (
                          <div
                            key={food.id}
                            className="px-3 py-1.5 text-xs text-gray-600 cursor-pointer hover:bg-gray-50 flex justify-between"
                          >
                            <span>{food.name}</span>
                            <span className="text-gray-400">
                              {Math.round(food.calories_per_serving)} kcal/{food.serving_size}{food.serving_unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
