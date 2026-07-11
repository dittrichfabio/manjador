import { useState, useEffect, createContext, useContext } from "react";
import type { UserProfile } from "../types";
import { getMe } from "../services/api";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  setUser: (u: UserProfile | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, setUser, loading };
}
