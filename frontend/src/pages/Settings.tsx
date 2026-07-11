import { useEffect, useState } from "react";
import { Download, Save, Upload } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  exportMeasurements, exportNutrition, exportWeights,
  importFoods, importMeasurements, importWeights,
  updateUser,
} from "../services/api";
import type { ActivityLevel, Gender } from "../types";

const ACTIVITY_OPTIONS: [ActivityLevel, string][] = [
  ["sedentary",        "Sedentary (little or no exercise)"],
  ["lightly_active",   "Lightly Active (1-3 days/week)"],
  ["moderately_active","Moderately Active (3-5 days/week)"],
  ["very_active",      "Very Active (6-7 days/week)"],
  ["extra_active",     "Extra Active (physical job or 2x training)"],
];

export default function Settings() {
  const { user, setUser } = useAuth();

  const [form, setForm] = useState({
    age: "",
    weight_kg: "",
    height_cm: "",
    gender: "" as Gender | "",
    activity_level: "" as ActivityLevel | "",
    calorie_goal: "",
    protein_goal_g: "",
    carbs_goal_g: "",
    fat_goal_g: "",
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [importMsg, setImportMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm({
      age:            user.age?.toString()            ?? "",
      weight_kg:      user.weight_kg?.toString()      ?? "",
      height_cm:      user.height_cm?.toString()      ?? "",
      gender:         user.gender                     ?? "",
      activity_level: user.activity_level             ?? "",
      calorie_goal:   user.calorie_goal?.toString()   ?? "",
      protein_goal_g: user.protein_goal_g?.toString() ?? "",
      carbs_goal_g:   user.carbs_goal_g?.toString()   ?? "",
      fat_goal_g:     user.fat_goal_g?.toString()     ?? "",
    });
  }, [user]);

  const sf = (field: string, val: string) =>
    setForm((p) => ({ ...p, [field]: val }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const updated = await updateUser(user.id, {
        age:            form.age            ? parseInt(form.age)              : undefined,
        weight_kg:      form.weight_kg      ? parseFloat(form.weight_kg)      : undefined,
        height_cm:      form.height_cm      ? parseFloat(form.height_cm)      : undefined,
        gender:         (form.gender        as Gender      | undefined)       || undefined,
        activity_level: (form.activity_level as ActivityLevel | undefined)    || undefined,
        calorie_goal:   form.calorie_goal   ? parseInt(form.calorie_goal)     : undefined,
        protein_goal_g: form.protein_goal_g ? parseFloat(form.protein_goal_g) : undefined,
        carbs_goal_g:   form.carbs_goal_g   ? parseFloat(form.carbs_goal_g)   : undefined,
        fat_goal_g:     form.fat_goal_g     ? parseFloat(form.fat_goal_g)     : undefined,
      });
      setUser(updated as any);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (
    type: "weights" | "measurements" | "foods",
    file: File
  ) => {
    if (!user) return;
    setImportMsg("");
    try {
      if (type === "weights")       await importWeights(user.id, file);
      else if (type === "measurements") await importMeasurements(user.id, file);
      else                          await importFoods(user.id, file);
      setImportMsg("Import successful!");
    } catch {
      setImportMsg("Import failed. Check file format.");
    }
  };

  const IMPORT_ROWS: { label: string; type: "weights" | "measurements" | "foods" }[] = [
    { label: "Import Weights (CSV)",      type: "weights" },
    { label: "Import Measurements (CSV)", type: "measurements" },
    { label: "Import Foods (CSV)",        type: "foods" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Profile section */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-lg">Profile</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Username</label>
            <input
              className="input bg-gray-50 cursor-not-allowed"
              value={user?.username ?? ""}
              disabled
            />
          </div>
          <div>
            <label className="label">Age</label>
            <input
              type="number"
              className="input"
              value={form.age}
              onChange={(e) => sf("age", e.target.value)}
              placeholder="25"
            />
          </div>
          <div>
            <label className="label">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={form.weight_kg}
              onChange={(e) => sf("weight_kg", e.target.value)}
              placeholder="70.0"
            />
          </div>
          <div>
            <label className="label">Height (cm)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={form.height_cm}
              onChange={(e) => sf("height_cm", e.target.value)}
              placeholder="175.0"
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              className="input"
              value={form.gender}
              onChange={(e) => sf("gender", e.target.value)}
            >
              <option value="">— select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Activity Level</label>
            <select
              className="input"
              value={form.activity_level}
              onChange={(e) => sf("activity_level", e.target.value)}
            >
              <option value="">— select —</option>
              {ACTIVITY_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Computed TDEE info box */}
        {user?.computed_tdee && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1">
            <p className="text-sm font-semibold text-blue-700">Computed Estimates</p>
            {user.computed_bmr != null && (
              <p className="text-xs text-blue-600">
                BMR: {Math.round(user.computed_bmr)} kcal/day
              </p>
            )}
            <p className="text-xs text-blue-600">
              TDEE: {Math.round(user.computed_tdee)} kcal/day
            </p>
            {user.suggested_calories != null && (
              <p className="text-xs text-blue-600">
                Suggested calories: {Math.round(user.suggested_calories)} kcal/day
              </p>
            )}
            {user.suggested_protein_g != null && (
              <p className="text-xs text-blue-600">
                Suggested protein: {Math.round(user.suggested_protein_g)}g/day
              </p>
            )}
            {user.suggested_carbs_g != null && (
              <p className="text-xs text-blue-600">
                Suggested carbs: {Math.round(user.suggested_carbs_g)}g/day
              </p>
            )}
            {user.suggested_fat_g != null && (
              <p className="text-xs text-blue-600">
                Suggested fat: {Math.round(user.suggested_fat_g)}g/day
              </p>
            )}
          </div>
        )}
      </div>

      {/* Nutrition Goals section */}
      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Nutrition Goals</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Override the computed suggestions with custom targets.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Daily Calories (kcal)", "calorie_goal",   "1", "2000"],
            ["Protein (g)",           "protein_goal_g", "1", "150"],
            ["Carbs (g)",             "carbs_goal_g",   "1", "200"],
            ["Fat (g)",               "fat_goal_g",     "1", "70"],
          ].map(([label, field, step, placeholder]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <input
                type="number"
                step={step}
                min="0"
                className="input"
                value={(form as any)[field]}
                onChange={(e) => sf(field, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && (
        <p className="text-green-600 text-sm font-medium">
          Settings saved successfully!
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary disabled:opacity-50"
      >
        <Save size={16} />
        {saving ? "Saving..." : "Save Settings"}
      </button>

      {/* Export section */}
      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Export Data</h3>
          <p className="text-xs text-gray-400 mt-0.5">Download your data as CSV files.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => user && exportWeights(user.id)}
            className="btn-secondary"
          >
            <Download size={15} /> Weights CSV
          </button>
          <button
            onClick={() => user && exportMeasurements(user.id)}
            className="btn-secondary"
          >
            <Download size={15} /> Measurements CSV
          </button>
          <button
            onClick={() => user && exportNutrition(user.id)}
            className="btn-secondary"
          >
            <Download size={15} /> Nutrition CSV
          </button>
        </div>
      </div>

      {/* Import section */}
      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Import Data</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Upload CSV files exported from Manjador or compatible sources.
          </p>
        </div>
        <div className="space-y-4">
          {IMPORT_ROWS.map(({ label, type }) => (
            <div key={type}>
              <label className="label">{label}</label>
              <label className="btn-secondary cursor-pointer w-fit">
                <Upload size={15} />
                Choose File
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(type, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          ))}
        </div>
        {importMsg && (
          <p className={`text-sm font-medium ${importMsg.includes("failed") ? "text-red-500" : "text-green-600"}`}>
            {importMsg}
          </p>
        )}
      </div>
    </div>
  );
}
