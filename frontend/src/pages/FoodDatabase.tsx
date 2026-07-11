import { useEffect, useRef, useState } from "react";
import { CheckCircle, Edit2, Plus, Search, Trash2, Upload, X } from "lucide-react";
import {
  createFood, deleteFood, getFoods, updateFood, uploadFoodPhoto,
} from "../services/api";
import type { Food } from "../types";

type FormState = Omit<Food, "id" | "created_by" | "created_at" | "is_verified">;

const BLANK: FormState = {
  name: "", brand: "", serving_size: 100, serving_unit: "g",
  calories_per_100g: 0, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0,
  fiber_per_100g: undefined, sugar_per_100g: undefined,
};

const NUM_FIELDS = [
  "serving_size","calories_per_100g","protein_per_100g",
  "carbs_per_100g","fat_per_100g","fiber_per_100g","sugar_per_100g",
];

export default function FoodDatabase() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  const load = (q?: string) => {
    setLoading(true);
    getFoods(q)
      .then(setFoods)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openNew = () => {
    setEditId(null);
    setForm({ ...BLANK });
    setError("");
    setShowForm(true);
  };

  const openEdit = (food: Food) => {
    setEditId(food.id);
    setForm({
      name: food.name, brand: food.brand || "",
      serving_size: food.serving_size, serving_unit: food.serving_unit,
      calories_per_100g: food.calories_per_100g, protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g, fat_per_100g: food.fat_per_100g,
      fiber_per_100g: food.fiber_per_100g, sugar_per_100g: food.sugar_per_100g,
    });
    setError("");
    setShowForm(true);
  };

  const setField = (field: string, raw: string) =>
    setForm((p) => ({
      ...p,
      [field]: NUM_FIELDS.includes(field) ? (raw === "" ? undefined : parseFloat(raw) || 0) : raw,
    }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    try {
      if (editId != null) {
        await updateFood(editId, form);
      } else {
        await createFood(form);
      }
      setShowForm(false);
      load(search || undefined);
    } catch {
      setError("Failed to save food.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this food?")) return;
    await deleteFood(id).catch(() => {});
    load(search || undefined);
  };

  const handleVerify = async (food: Food) => {
    await updateFood(food.id, { is_verified: true }).catch(() => {});
    load(search || undefined);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const food = await uploadFoodPhoto(file);
      openEdit(food);
      load(search || undefined);
    } catch {
      setError("Photo extraction failed. Please enter nutrition info manually.");
    } finally {
      setUploading(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  const MACRO_FIELDS: [string, string, string][] = [
    ["Calories / 100g", "calories_per_100g", "kcal"],
    ["Protein / 100g",  "protein_per_100g",  "g"],
    ["Carbs / 100g",    "carbs_per_100g",    "g"],
    ["Fat / 100g",      "fat_per_100g",      "g"],
    ["Fiber / 100g",    "fiber_per_100g",    "g"],
    ["Sugar / 100g",    "sugar_per_100g",    "g"],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Food Database</h2>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => photoRef.current?.click()}
            disabled={uploading}
            className="btn-secondary disabled:opacity-50"
          >
            <Upload size={15} />
            {uploading ? "Reading..." : "Photo"}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhoto}
          />
          <button onClick={openNew} className="btn-primary">
            <Plus size={15} /> Add Food
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search foods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editId != null ? "Edit Food" : "New Food"}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Food name"
              />
            </div>
            <div>
              <label className="label">Brand</label>
              <input
                className="input"
                value={form.brand ?? ""}
                onChange={(e) => setField("brand", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="label">Serving size</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input"
                  value={form.serving_size}
                  onChange={(e) => setField("serving_size", e.target.value)}
                />
                <input
                  className="input w-16"
                  value={form.serving_unit}
                  onChange={(e) => setField("serving_unit", e.target.value)}
                  placeholder="g"
                />
              </div>
            </div>

            {MACRO_FIELDS.map(([label, field, unit]) => (
              <div key={field}>
                <label className="label">
                  {label} <span className="text-gray-400 font-normal">({unit})</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="input"
                  value={(form as any)[field] ?? ""}
                  onChange={(e) => setField(field, e.target.value)}
                />
              </div>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Food list */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : foods.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">No foods found.</div>
      ) : (
        <div className="space-y-2">
          {foods.map((food) => (
            <div key={food.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{food.name}</span>
                  {food.brand && (
                    <span className="text-xs text-gray-400">{food.brand}</span>
                  )}
                  {!food.is_verified ? (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      Unverified
                    </span>
                  ) : (
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-3">
                  <span>{Math.round(food.calories_per_100g)} kcal</span>
                  <span>P: {food.protein_per_100g}g</span>
                  <span>C: {food.carbs_per_100g}g</span>
                  <span>F: {food.fat_per_100g}g</span>
                  <span className="text-gray-300">/ 100g</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!food.is_verified && (
                  <button
                    onClick={() => handleVerify(food)}
                    className="btn-secondary text-xs px-2 py-1"
                  >
                    Verify
                  </button>
                )}
                <button
                  onClick={() => openEdit(food)}
                  className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(food.id)}
                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
