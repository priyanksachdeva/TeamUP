import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderKanban, Users, LogOut, Moon, Sun, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/members", label: "Team", icon: Users },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/50"
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight">Linear<span className="text-primary">Tasks</span></span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Team Workspace</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          <div className="px-3 pb-2 eyebrow">Workspace</div>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200 ${
                  isActive
                    ? "bg-primary/10 text-foreground border border-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between rounded-md border border-border bg-background/50 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar user={user} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user?.name}</div>
                <div className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {user?.role}
                </div>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={logout}
                    data-testid="logout-button"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="eyebrow">{location.pathname.replace("/", "") || "dashboard"}</div>
              <div className="text-sm text-muted-foreground hidden sm:block">
                Manage projects, tasks, and your team.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggle}
              data-testid="theme-toggle"
              className="h-9 w-9"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="md:hidden">
              <UserAvatar user={user} size="sm" />
            </div>
          </div>
        </header>

        {/* mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-3 gap-1 border-t border-border bg-card/95 p-2 backdrop-blur">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 rounded-md py-2 text-[11px] ${
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
