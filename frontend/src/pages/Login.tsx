import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, loginUser, createUser } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import type { User } from "../types";

export default function Login() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMode, setNewMode] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (username: string) => {
    setBusy(true);
    setError("");
    try {
      const u = await loginUser(username);
      setUser(u as any);
      navigate("/");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!newUsername.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createUser(newUsername.trim());
      const u = await loginUser(newUsername.trim());
      setUser(u as any);
      navigate("/");
    } catch {
      setError("Could not create user. Username may already exist.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600">Manjador</h1>
          <p className="text-gray-400 mt-2 text-sm">Nutrition &amp; fitness tracker</p>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-4">Loading...</p>
        ) : (
          <>
            {/* Existing users */}
            {users.length > 0 && (
              <div className="space-y-2 mb-5">
                <p className="label">Select your profile</p>
                {users.map((u) => (
                  <button
                    key={u.id}
                    disabled={busy}
                    onClick={() => handleLogin(u.username)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all font-medium text-gray-800 disabled:opacity-50"
                  >
                    {u.username}
                  </button>
                ))}
              </div>
            )}

            {/* Divider */}
            {users.length > 0 && (
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs text-gray-400">or</span>
                </div>
              </div>
            )}

            {/* New user */}
            {!newMode ? (
              <button
                onClick={() => setNewMode(true)}
                className="btn-secondary w-full justify-center"
              >
                + Create new profile
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label">New username</label>
                  <input
                    className="input"
                    placeholder="e.g. john_doe"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setNewMode(false); setNewUsername(""); setError(""); }}
                    className="btn-secondary flex-1 justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={busy || !newUsername.trim()}
                    className="btn-primary flex-1 justify-center disabled:opacity-50"
                  >
                    {busy ? "Creating..." : "Create & Login"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
