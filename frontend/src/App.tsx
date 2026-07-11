import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext, useAuthState } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DailyLog from "./pages/DailyLog";
import MealPlanner from "./pages/MealPlanner";
import FoodDatabase from "./pages/FoodDatabase";
import WeightTracker from "./pages/WeightTracker";
import Measurements from "./pages/Measurements";
import Charts from "./pages/Charts";
import Settings from "./pages/Settings";

export default function App() {
  const auth = useAuthState();

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              auth.loading ? (
                <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
              ) : auth.user ? (
                <Layout />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="log" element={<DailyLog />} />
            <Route path="planner" element={<MealPlanner />} />
            <Route path="foods" element={<FoodDatabase />} />
            <Route path="weight" element={<WeightTracker />} />
            <Route path="measurements" element={<Measurements />} />
            <Route path="charts" element={<Charts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
