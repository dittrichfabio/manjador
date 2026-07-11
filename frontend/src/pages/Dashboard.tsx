import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Scale, Flame, Target } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getDailySummary, getWeightLogs } from "../services/api";
import MacroBar from "../components/MacroBar";
import type { DailySummary, WeightLog } from "../types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDailySummary(user.id, todayISO()).catch(() => null),
      getWeightLogs(user.id).catch(() => [] as WeightLog[]),
    ]).then(([sum, weights]) => {
      setSummary(sum as DailySummary | null);
      const sorted = (weights as WeightLog[]).sort((a, b) => b.date.localeCompare(a.date));
      setLatestWeight(sorted[0] ?? null);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="text-gray-400 text-sm">Loading dashboard...</div>;
  }

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold">
          {greeting()}{user ? `, ${user.username}` : ""}!
        </h2>
        <p className="text-gray-400 text-sm mt-0.5">{dateLabel}</p>
      </div>

      {/* Quick-stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {latestWeight && (
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Scale className="text-blue-500" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Latest Weight</p>
              <p className="text-xl font-bold">
                {latestWeight.weight_kg}
                <span className="text-sm font-normal text-gray-400 ml-1">kg</span>
              </p>
              <p className="text-xs text-gray-400 truncate">{latestWeight.date}</p>
            </div>
          </div>
        )}

        {user?.computed_tdee && (
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <Flame className="text-orange-500" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">TDEE</p>
              <p className="text-xl font-bold">
                {Math.round(user.computed_tdee)}
                <span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
              </p>
              <p className="text-xs text-gray-400">Daily expenditure</p>
            </div>
          </div>
        )}

        {user?.calorie_goal && (
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
              <Target className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Calorie Goal</p>
              <p className="text-xl font-bold">
                {user.calorie_goal}
                <span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
              </p>
              <p className="text-xs text-gray-400">Daily target</p>
            </div>
          </div>
        )}
      </div>

      {/* Today nutrition */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Today&apos;s Nutrition</h3>
        {summary ? (
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
        ) : (
          <div className="card text-center text-gray-400 py-10">
            <p className="mb-3">No meals logged today.</p>
            <Link to="/log" className="btn-primary inline-flex">
              Log your first meal
            </Link>
          </div>
        )}
      </div>

      {/* Meals list */}
      {summary && summary.meals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Today&apos;s Meals</h3>
            <Link to="/log" className="text-sm text-primary-600 hover:underline">
              Edit
            </Link>
          </div>
          <div className="space-y-2">
            {summary.meals.map((meal) => (
              <div key={meal.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {meal.category.emoji} {meal.category.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(meal.total_calories)} kcal
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-400 space-x-3">
                  <span>P: {Math.round(meal.total_protein_g)}g</span>
                  <span>C: {Math.round(meal.total_carbs_g)}g</span>
                  <span>F: {Math.round(meal.total_fat_g)}g</span>
                </div>
                {meal.items.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {meal.items.map((item) => (
                      <li key={item.id} className="text-xs text-gray-400">
                        {item.food.name} — {item.amount_g}g
                        ({Math.round(item.calories)} kcal)
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
