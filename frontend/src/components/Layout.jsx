import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  LogOut,
  Moon,
  Sun,
  Bell,
  Search,
  Hexagon,
  ListChecks,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/my-tasks", label: "My tasks", icon: ListChecks },
  { to: "/members", label: "Team", icon: Users },
];

function SidebarLink({ to, label, icon: Icon }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={to}
            data-testid={`nav-${label.toLowerCase()}`}
            className={({ isActive }) =>
              `flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-6px_hsl(244_76%_59%/0.55)]"
                  : "text-gray-900 dark:text-gray-300 hover:bg-accent"
              }`
            }
          >
            <Icon className="h-5 w-5 text-gray-900 dark:text-gray-300" />
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Narrow icon-only sidebar */}
      <aside
        data-testid="sidebar"
        className="hidden md:flex w-20 shrink-0 flex-col items-center border-r border-border bg-card/60 py-6"
      >
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Hexagon className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <span className="font-display text-[11px] font-bold tracking-[0.18em] text-foreground">
            TeamUP
          </span>
        </div>

        <nav className="mt-10 flex flex-col items-center gap-2">
          {NAV.map((n) => (
            <SidebarLink key={n.to} {...n} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggle}
                  data-testid="theme-toggle"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-900 dark:text-gray-300 transition-colors duration-200 hover:bg-accent"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Toggle theme</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={logout}
                  data-testid="logout-button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-900 dark:text-gray-300 transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur-md">
          <div className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Hexagon className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-1 items-center">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                readOnly
                placeholder="Search anything…"
                onClick={() => {
                  const ev = new KeyboardEvent("keydown", {
                    key: "k",
                    metaKey: true,
                  });
                  window.dispatchEvent(ev);
                }}
                className="h-11 cursor-pointer rounded-full border-border bg-card pl-11 pr-16 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
                data-testid="global-search"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                ⌘K
              </kbd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-card border border-border text-muted-foreground transition-colors duration-200 hover:text-foreground"
              data-testid="notifications-button"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <div className="flex items-center gap-3 rounded-full border border-border bg-card py-1 pl-1 pr-3">
              <UserAvatar user={user} size="sm" />
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-semibold">
                  {user?.name?.split(" ")[0]}
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {user?.role}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 gap-1 border-t border-border bg-card/95 p-2 backdrop-blur">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px] ${
                  isActive
                    ? "text-primary-foreground bg-primary"
                    : "text-muted-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
