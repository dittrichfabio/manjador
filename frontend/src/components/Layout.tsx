import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, CalendarDays, Database, Heart,
  Scale, Ruler, BarChart2, Settings, LogOut, Menu,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { logoutUser } from "../services/api";

const NAV = [
  { to: "/",             label: "Dashboard",     Icon: LayoutDashboard },
  { to: "/log",          label: "Daily Log",     Icon: BookOpen },
  { to: "/planner",      label: "Meal Planner",  Icon: CalendarDays },
  { to: "/foods",        label: "Food Database", Icon: Database },
  { to: "/my-foods",     label: "My Foods",      Icon: Heart },
  { to: "/weight",       label: "Weight",        Icon: Scale },
  { to: "/measurements", label: "Measurements",  Icon: Ruler },
  { to: "/charts",       label: "Charts",        Icon: BarChart2 },
  { to: "/settings",     label: "Settings",      Icon: Settings },
];

function linkCls({ isActive }: { isActive: boolean }) {
  return [
    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
    isActive
      ? "bg-primary-50 text-primary-700"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  ].join(" ");
}

function SideNav({ onClose }: { onClose?: () => void }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser().catch(() => {});
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-primary-600">Manjador</h1>
        {user && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">@{user.username}</p>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={linkCls}
            onClick={onClose}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-colors"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 shrink-0">
        <SideNav />
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-56 h-full bg-white z-50 shadow-xl">
            <SideNav onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu size={22} />
          </button>
          <span className="text-lg font-bold text-primary-600">Manjador</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
