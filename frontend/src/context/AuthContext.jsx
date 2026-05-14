import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // user: null = checking, false = not authed, object = authed
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("ttm_token");
    if (!token) {
      setUser(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem("ttm_token");
      setUser(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("ttm_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (name, email, password) => {
    const { data } = await api.post("/auth/signup", { name, email, password, role: "member" });
    localStorage.setItem("ttm_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("ttm_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
