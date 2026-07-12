import { useEffect, useState } from "react";
import { Link2, Plus, Search, Trash2, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  addFoodPairing, addMyFood, getFoods, getMealCategories,
  getMyFoodPairings, getMyFoods, removeFoodPairing, removeMyFood, updateMyFood,
} from "../services/api";
import type { Food, FoodPairing, MealCategory, UserFood } from "../types";

// ---------------------------------------------------------------------------
// Category badge
// ---------------------------------------------------------------------------
function CategoryBadge({ cat }: { cat: MealCategory }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: cat.color }}
    >
      {cat.emoji} {cat.name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Category selector (multi-select checkboxes)
// ---------------------------------------------------------------------------
function CategorySelector({
  categories,
  selected,
  onChange,
}: {
  categories: MealCategory[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => toggle(cat.id)}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors",
            selected.includes(cat.id)
              ? "text-white border-transparent"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
          ].join(" ")}
          style={selected.includes(cat.id) ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
        >
          {cat.emoji} {cat.name}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Food modal (search from full database)
// ---------------------------------------------------------------------------
function AddFoodModal({
  categories,
  onAdd,
  onClose,
}: {
  categories: MealCategory[];
  onAdd: (foodId: number, categoryIds: number[]) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => getFoods(query).then(setResults).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleAdd = async () => {
    if (!selectedFood) return;
    setSaving(true);
    setError("");
    try {
      await onAdd(selectedFood.id, selectedCats);
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(detail || "Failed to add food.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Add Food to My Foods</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search food database..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedFood(null); }}
            autoFocus
          />
        </div>

        {/* Results */}
        {results.length > 0 && !selectedFood && (
          <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {results.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                  onClick={() => { setSelectedFood(food); setQuery(food.name); setResults([]); }}
                >
                  <span className="font-medium text-sm">{food.name}</span>
                  {food.brand && <span className="text-xs text-gray-400 ml-1">— {food.brand}</span>}
                  <span className="text-xs text-gray-400 ml-2">
                    {food.calories_per_serving} kcal / {food.serving_size}{food.serving_unit}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Selected food info */}
        {selectedFood && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <p className="font-medium">{selectedFood.name}{selectedFood.brand && ` — ${selectedFood.brand}`}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedFood.calories_per_serving} kcal &middot; P {selectedFood.protein_per_serving}g &middot;
              C {selectedFood.carbs_per_serving}g &middot; F {selectedFood.fat_per_serving}g &middot;
              per {selectedFood.serving_size}{selectedFood.serving_unit}
            </p>
          </div>
        )}

        {/* Categories */}
        <div>
          <label className="label mb-2">Meal categories (optional)</label>
          <CategorySelector categories={categories} selected={selectedCats} onChange={setSelectedCats} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleAdd}
            disabled={!selectedFood || saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add to My Foods"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Categories modal
// ---------------------------------------------------------------------------
function EditCategoriesModal({
  userFood,
  categories,
  onSave,
  onClose,
}: {
  userFood: UserFood;
  categories: MealCategory[];
  onSave: (categoryIds: number[]) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number[]>(userFood.meal_categories.map((c) => c.id));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(selected); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit Categories</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-600">{userFood.food.name}</p>
        <CategorySelector categories={categories} selected={selected} onChange={setSelected} />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pairings modal
// ---------------------------------------------------------------------------
function PairingsModal({
  userFood,
  myFoods,
  pairings,
  onAdd,
  onRemove,
  onClose,
}: {
  userFood: UserFood;
  myFoods: UserFood[];
  pairings: FoodPairing[];
  onAdd: (otherFoodId: number) => Promise<void>;
  onRemove: (pairingId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  // Pairings involving this food
  const myPairings = pairings.filter(
    (p) => p.food_a_id === userFood.food_id || p.food_b_id === userFood.food_id
  );

  // Other foods available to pair (already in My Foods, not self, not already paired)
  const pairedIds = new Set(myPairings.flatMap((p) => [p.food_a_id, p.food_b_id]));
  pairedIds.add(userFood.food_id);
  const available = myFoods.filter(
    (uf) => !pairedIds.has(uf.food_id) &&
      uf.food.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = async (otherFoodId: number) => {
    setAdding(true);
    try { await onAdd(otherFoodId); setQuery(""); }
    finally { setAdding(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Pairings</h3>
            <p className="text-sm text-gray-500">{userFood.food.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Current pairings */}
        {myPairings.length > 0 ? (
          <ul className="space-y-1">
            {myPairings.map((p) => {
              const other = p.food_a_id === userFood.food_id ? p.food_b : p.food_a;
              return (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Link2 size={13} className="text-gray-400" />
                    <span className="font-medium">{other.name}</span>
                    {other.brand && <span className="text-xs text-gray-400">{other.brand}</span>}
                  </div>
                  <button
                    onClick={() => onRemove(p.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">No pairings yet.</p>
        )}

        {/* Add pairing */}
        <div className="space-y-2">
          <label className="label">Add pairing from My Foods</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8 text-sm"
              placeholder="Search My Foods..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {query.trim() && available.length > 0 && (
            <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-36 overflow-y-auto">
              {available.map((uf) => (
                <li key={uf.food_id}>
                  <button
                    type="button"
                    disabled={adding}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm disabled:opacity-50 transition-colors"
                    onClick={() => handleAdd(uf.food_id)}
                  >
                    <span className="font-medium">{uf.food.name}</span>
                    {uf.food.brand && <span className="text-xs text-gray-400 ml-1">— {uf.food.brand}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && available.length === 0 && (
            <p className="text-xs text-gray-400 px-1">No unpaired foods found.</p>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function MyFoods() {
  const { user } = useAuth();
  const [myFoods, setMyFoods] = useState<UserFood[]>([]);
  const [pairings, setPairings] = useState<FoodPairing[]>([]);
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCats, setEditingCats] = useState<UserFood | null>(null);
  const [pairingFood, setPairingFood] = useState<UserFood | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getMyFoods(user.id).catch(() => [] as UserFood[]),
      getMyFoodPairings(user.id).catch(() => [] as FoodPairing[]),
    ]).then(([foods, pairs]) => {
      setMyFoods(foods as UserFood[]);
      setPairings(pairs as FoodPairing[]);
    }).finally(() => setLoading(false));
  }, [user?.id, reloadTrigger]);
  useEffect(() => { getMealCategories().then(setCategories).catch(() => {}); }, []);

  const filtered = myFoods.filter((uf) => {
    const matchesSearch =
      uf.food.name.toLowerCase().includes(search.toLowerCase()) ||
      (uf.food.brand ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategoryIds.length === 0 ||
      uf.meal_categories.some((cat) => selectedCategoryIds.includes(cat.id));

    return matchesSearch && matchesCategory;
  });

  const handleAdd = async (foodId: number, categoryIds: number[]) => {
    if (!user) return;
    await addMyFood(user.id, { food_id: foodId, meal_category_ids: categoryIds });
    setReloadTrigger((v) => v + 1);
  };

  const handleUpdateCats = async (categoryIds: number[]) => {
    if (!user || !editingCats) return;
    await updateMyFood(user.id, editingCats.food_id, { meal_category_ids: categoryIds });
    setReloadTrigger((v) => v + 1);
  };

  const handleRemove = async (foodId: number) => {
    if (!user || !window.confirm("Remove this food from My Foods?")) return;
    await removeMyFood(user.id, foodId).catch(() => {});
    setReloadTrigger((v) => v + 1);
  };

  const handleAddPairing = async (otherFoodId: number) => {
    if (!user || !pairingFood) return;
    await addFoodPairing(user.id, { food_a_id: pairingFood.food_id, food_b_id: otherFoodId });
    const updated = await getMyFoodPairings(user.id);
    setPairings(updated);
  };

  const handleRemovePairing = async (pairingId: number) => {
    if (!user) return;
    await removeFoodPairing(user.id, pairingId).catch(() => {});
    const updated = await getMyFoodPairings(user.id);
    setPairings(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">My Foods</h2>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={15} /> Add Food
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Filter My Foods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategoryIds([])}
            className={[
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              selectedCategoryIds.length === 0
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400",
            ].join(" ")}
          >
            All
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() =>
                  setSelectedCategoryIds((prev) =>
                    isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                  )
                }
                className={[
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  isSelected
                    ? "text-white border-transparent"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400",
                ].join(" ")}
                style={isSelected ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
              >
                {cat.emoji} {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-gray-400 py-10 space-y-2">
          <p className="font-medium">
            {myFoods.length === 0
              ? "Your food list is empty."
              : "No foods match your filters."}
          </p>
          {myFoods.length === 0 && (
            <p className="text-sm">
              Click <strong>Add Food</strong> to add foods from the database to your personal list.
            </p>
          )}
          {myFoods.length > 0 && (search || selectedCategoryIds.length > 0) && (
            <p className="text-sm">
              Try clearing your search or category filters.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((uf) => {
            const myPairings = pairings.filter(
              (p) => p.food_a_id === uf.food_id || p.food_b_id === uf.food_id
            );
            const pairedFoods = myPairings.map((p) =>
              p.food_a_id === uf.food_id ? p.food_b : p.food_a
            );
            return (
              <div key={uf.id} className="card flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium">{uf.food.name}</span>
                    {uf.food.brand && (
                      <span className="text-xs text-gray-400">{uf.food.brand}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {uf.food.calories_per_serving} kcal &middot; P {uf.food.protein_per_serving}g &middot;
                    C {uf.food.carbs_per_serving}g &middot; F {uf.food.fat_per_serving}g &middot;
                    per {uf.food.serving_size}{uf.food.serving_unit}
                  </p>
                  {/* Category badges */}
                  {uf.meal_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {uf.meal_categories.map((cat) => (
                        <CategoryBadge key={cat.id} cat={cat} />
                      ))}
                    </div>
                  )}
                  {/* Paired foods */}
                  {pairedFoods.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Link2 size={11} />
                        <span>Pairs with:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pairedFoods.map((food) => (
                          <span
                            key={food.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                          >
                            {food.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Pairing button */}
                  <button
                    onClick={() => setPairingFood(uf)}
                    title="Manage pairings"
                    className={[
                      "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      myPairings.length > 0
                        ? "bg-primary-50 text-primary-700 hover:bg-primary-100"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
                    ].join(" ")}
                  >
                    <Link2 size={13} />
                    {myPairings.length > 0 && <span>{myPairings.length}</span>}
                  </button>

                  {/* Edit categories button */}
                  <button
                    onClick={() => setEditingCats(uf)}
                    title="Edit meal categories"
                    className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    {uf.meal_categories.length === 0 ? "Tag" : "Edit"}
                  </button>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(uf.food_id)}
                    title="Remove from My Foods"
                    className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddFoodModal
          categories={categories}
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {editingCats && (
        <EditCategoriesModal
          userFood={editingCats}
          categories={categories}
          onSave={handleUpdateCats}
          onClose={() => setEditingCats(null)}
        />
      )}
      {pairingFood && (
        <PairingsModal
          userFood={pairingFood}
          myFoods={myFoods}
          pairings={pairings}
          onAdd={handleAddPairing}
          onRemove={handleRemovePairing}
          onClose={() => setPairingFood(null)}
        />
      )}
    </div>
  );
}
