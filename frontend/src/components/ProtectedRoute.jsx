import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user } = useAuth();

  if (user === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground" data-testid="auth-loading">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-sm tracking-wide">Authenticating...</span>
        </div>
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}
