interface Props {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goalCalories?: number;
  goalProtein?: number;
  goalCarbs?: number;
  goalFat?: number;
  showNutrients?: string[];  // e.g. ["calories", "protein"]
}

function ProgressBar({ value, goal, color }: { value: number; goal?: number; color: string }) {
  const pct = goal ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MacroBar({
  calories, protein, carbs, fat,
  goalCalories, goalProtein, goalCarbs, goalFat,
  showNutrients = ["calories", "protein", "carbs", "fat"],
}: Props) {
  const allMacros = [
    { key: "calories", label: "Calories", value: calories, goal: goalCalories, unit: "kcal", color: "bg-orange-400" },
    { key: "protein",  label: "Protein",  value: protein,  goal: goalProtein,  unit: "g",    color: "bg-blue-400" },
    { key: "carbs",    label: "Carbs",    value: carbs,    goal: goalCarbs,    unit: "g",    color: "bg-yellow-400" },
    { key: "fat",      label: "Fat",      value: fat,      goal: goalFat,      unit: "g",    color: "bg-pink-400" },
  ];

  const macros = allMacros.filter((m) => showNutrients.includes(m.key));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {macros.map(({ key, label, value, goal, unit, color }) => (
        <div key={key} className="card">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">
            {Math.round(value)}
            <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
          </p>
          {goal != null && (
            <>
              <p className="text-xs text-gray-400 mt-0.5">/ {Math.round(goal)} {unit}</p>
              <ProgressBar value={value} goal={goal} color={color} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
