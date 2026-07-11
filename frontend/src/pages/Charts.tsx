import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useAuth } from "../hooks/useAuth";
import {
  getMealLogs, getMeasurements, getMeasurementTypes, getWeightLogs,
} from "../services/api";
import type { BodyMeasurement, MealLog, WeightLog } from "../types";

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
];

const PIE_COLORS = ["#60a5fa", "#facc15", "#f472b6"];

function subtractDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function Charts() {
  const { user } = useAuth();
  const [range, setRange] = useState(30);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [measureTypes, setMeasureTypes] = useState<string[]>([]);
  const [activeMeasureType, setActiveMeasureType] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    const start = subtractDays(range);
    const end = todayISO();
    setLoading(true);
    Promise.all([
      getWeightLogs(user.id, start, end).catch(() => [] as WeightLog[]),
      getMealLogs(user.id, start, end).catch(() => [] as MealLog[]),
      getMeasurements(user.id).catch(() => [] as BodyMeasurement[]),
      getMeasurementTypes(user.id).catch(() => [] as string[]),
    ]).then(([w, m, ms, mt]) => {
      setWeightLogs((w as WeightLog[]).sort((a, b) => a.date.localeCompare(b.date)));
      setMealLogs(m as MealLog[]);
      setMeasurements(ms as BodyMeasurement[]);
      setMeasureTypes(mt as string[]);
      if ((mt as string[]).length > 0 && !activeMeasureType) {
        setActiveMeasureType((mt as string[])[0]);
      }
    }).finally(() => setLoading(false));
  }, [user, range]);

  useEffect(() => { load(); }, [load]);

  // Aggregate daily calories
  const calByDate: Record<string, number> = {};
  for (const log of mealLogs) {
    calByDate[log.date] = (calByDate[log.date] || 0) + log.total_calories;
  }
  const caloriesData = Object.entries(calByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, calories]) => ({ date: date.slice(5), calories: Math.round(calories) }));

  // Macro totals for pie
  const totalP = mealLogs.reduce((s, l) => s + l.total_protein_g, 0);
  const totalC = mealLogs.reduce((s, l) => s + l.total_carbs_g, 0);
  const totalF = mealLogs.reduce((s, l) => s + l.total_fat_g, 0);
  const pieData = [
    { name: "Protein", value: Math.round(totalP) },
    { name: "Carbs",   value: Math.round(totalC) },
    { name: "Fat",     value: Math.round(totalF) },
  ];

  // Measurement chart data for selected type
  const measureData = measurements
    .filter((m) => m.measurement_type === activeMeasureType)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ date: m.date.slice(5), value: m.value_cm }));

  const weightData = weightLogs.map((w) => ({
    date: w.date.slice(5),
    weight: w.weight_kg,
  }));

  return (
    <div className="space-y-6">
      {/* Header + range selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Charts</h2>
        <div className="flex gap-2 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={[
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                range === r.days
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading charts...</p>
      ) : (
        <>
          {/* Weight line chart */}
          <div className="card">
            <h3 className="font-semibold mb-4">Weight (kg)</h3>
            {weightData.length < 2 ? (
              <p className="text-gray-400 text-sm">
                {weightData.length === 0
                  ? "No weight data for this period."
                  : "Log more entries to see a trend."}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={45} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={weightData.length <= 30}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Daily calories bar chart */}
          <div className="card">
            <h3 className="font-semibold mb-4">Daily Calories (kcal)</h3>
            {caloriesData.length === 0 ? (
              <p className="text-gray-400 text-sm">No meal data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={caloriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} width={45} />
                  <Tooltip />
                  <Bar dataKey="calories" fill="#fb923c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Macro pie chart */}
          <div className="card">
            <h3 className="font-semibold mb-4">
              Macro Breakdown <span className="text-sm font-normal text-gray-400">(total for period)</span>
            </h3>
            {totalP + totalC + totalF === 0 ? (
              <p className="text-gray-400 text-sm">No macro data for this period.</p>
            ) : (
              <div className="flex items-center gap-8 flex-wrap">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}g`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: PIE_COLORS[i] }}
                      />
                      <span className="text-sm text-gray-600 w-16">{entry.name}</span>
                      <span className="font-semibold text-sm">{entry.value}g</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Body measurement line chart */}
          {measureTypes.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <h3 className="font-semibold">Body Measurements (cm)</h3>
                <div className="flex flex-wrap gap-2">
                  {measureTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveMeasureType(t)}
                      className={[
                        "px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors",
                        activeMeasureType === t
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {measureData.length < 2 ? (
                <p className="text-gray-400 text-sm">
                  {measureData.length === 0
                    ? `No data for ${activeMeasureType}.`
                    : "Log more entries to see a trend."}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={measureData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={45} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
