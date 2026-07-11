import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  createMeasurement, deleteMeasurement,
  getMeasurements, getMeasurementTypes,
} from "../services/api";
import type { BodyMeasurement } from "../types";

const COMMON_TYPES = [
  "waist","hip","chest","neck","thigh","bicep","calf","shoulder","forearm","wrist",
];

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function Measurements() {
  const { user } = useAuth();
  const [types, setTypes] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<string>("");
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(), measurement_type: "", value_cm: "", note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTypes = useCallback(() => {
    if (!user) return;
    getMeasurementTypes(user.id).then((t) => {
      setTypes(t);
      if (t.length > 0 && !activeType) setActiveType(t[0]);
    }).catch(() => {});
  }, [user]);

  const loadMeasurements = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getMeasurements(user.id, activeType || undefined)
      .then((data) =>
        setMeasurements(data.sort((a, b) => b.date.localeCompare(a.date)))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, activeType]);

  useEffect(() => { loadTypes(); }, [loadTypes]);
  useEffect(() => { loadMeasurements(); }, [loadMeasurements]);

  const sf = (field: string, val: string) =>
    setForm((p) => ({ ...p, [field]: val }));

  const resetForm = () => {
    setShowForm(false);
    setForm({ date: todayISO(), measurement_type: "", value_cm: "", note: "" });
    setError("");
  };

  const handleSave = async () => {
    if (!user || !form.measurement_type || !form.value_cm) return;
    setSaving(true);
    setError("");
    try {
      await createMeasurement(user.id, {
        date: form.date,
        measurement_type: form.measurement_type.trim().toLowerCase(),
        value_cm: parseFloat(form.value_cm),
        note: form.note || undefined,
      });
      resetForm();
      loadTypes();
      loadMeasurements();
    } catch {
      setError("Failed to save measurement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    await deleteMeasurement(user.id, id).catch(() => {});
    loadMeasurements();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Measurements</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Type filter pills */}
      {types.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveType("")}
            className={[
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              !activeType
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            ].join(" ")}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={[
                "px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors",
                activeType === t
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Add Measurement</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => sf("date", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Type *</label>
              <input
                list="mtype-list"
                className="input capitalize"
                placeholder="e.g. waist"
                value={form.measurement_type}
                onChange={(e) => sf("measurement_type", e.target.value)}
              />
              <datalist id="mtype-list">
                {COMMON_TYPES.map((t) => <option key={t} value={t} />)}
                {types
                  .filter((t) => !COMMON_TYPES.includes(t))
                  .map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="label">Value (cm) *</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={form.value_cm}
                onChange={(e) => sf("value_cm", e.target.value)}
                placeholder="80.5"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Note</label>
              <input
                className="input"
                value={form.note}
                onChange={(e) => sf("note", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={resetForm} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.measurement_type || !form.value_cm}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : measurements.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">
          No measurements recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {measurements.map((m) => (
            <div key={m.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium capitalize">{m.measurement_type}</span>
                  <span className="text-xl font-bold">{m.value_cm} cm</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                  <span>{m.date}</span>
                  {m.note && <span>· {m.note}</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                className="p-2 text-red-400 hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
