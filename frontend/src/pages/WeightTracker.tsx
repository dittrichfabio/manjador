import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { createWeightLog, deleteWeightLog, getWeightLogs } from "../services/api";
import type { WeightLog } from "../types";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function WeightTracker() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(), weight_kg: "", body_fat_pct: "", muscle_mass_kg: "", note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getWeightLogs(user.id)
      .then((data) =>
        setLogs(data.sort((a, b) => b.date.localeCompare(a.date)))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const latest = logs[0];

  const sf = (field: string, val: string) =>
    setForm((p) => ({ ...p, [field]: val }));

  const resetForm = () => {
    setShowForm(false);
    setForm({ date: todayISO(), weight_kg: "", body_fat_pct: "", muscle_mass_kg: "", note: "" });
    setError("");
  };

  const handleSave = async () => {
    if (!user || !form.weight_kg) return;
    setSaving(true);
    setError("");
    try {
      await createWeightLog(user.id, {
        date: form.date,
        weight_kg: parseFloat(form.weight_kg),
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : undefined,
        muscle_mass_kg: form.muscle_mass_kg ? parseFloat(form.muscle_mass_kg) : undefined,
        note: form.note || undefined,
      });
      resetForm();
      load();
    } catch {
      setError("Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    await deleteWeightLog(user.id, id).catch(() => {});
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Weight Tracker</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Log Weight
        </button>
      </div>

      {/* Latest stats */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Weight",      value: `${latest.weight_kg} kg` },
            { label: "Body Fat",    value: latest.body_fat_pct != null ? `${latest.body_fat_pct}%` : "—" },
            { label: "Muscle Mass", value: latest.muscle_mass_kg != null ? `${latest.muscle_mass_kg} kg` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="card">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">As of {latest.date}</p>
            </div>
          ))}
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Log Weight Entry</h3>
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
              <label className="label">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={form.weight_kg}
                onChange={(e) => sf("weight_kg", e.target.value)}
                placeholder="70.5"
              />
            </div>
            <div>
              <label className="label">Body Fat (%)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={form.body_fat_pct}
                onChange={(e) => sf("body_fat_pct", e.target.value)}
                placeholder="20.0"
              />
            </div>
            <div>
              <label className="label">Muscle Mass (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={form.muscle_mass_kg}
                onChange={(e) => sf("muscle_mass_kg", e.target.value)}
                placeholder="55.0"
              />
            </div>
            <div>
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
              disabled={saving || !form.weight_kg}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : logs.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">No weight entries yet.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-lg">{log.weight_kg} kg</span>
                  {log.body_fat_pct != null && (
                    <span className="text-sm text-gray-500">{log.body_fat_pct}% fat</span>
                  )}
                  {log.muscle_mass_kg != null && (
                    <span className="text-sm text-gray-500">{log.muscle_mass_kg} kg muscle</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                  <span>{log.date}</span>
                  {log.note && <span>· {log.note}</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(log.id)}
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
