import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./ui/command";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ListChecks,
  Moon,
  Sun,
  LogOut,
  FileText,
  Sparkles,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open && user) {
      Promise.all([api.get("/projects"), api.get("/tasks")])
        .then(([p, t]) => {
          setProjects(p.data);
          setTasks(t.data);
        })
        .catch((err) => {
          console.error("CommandPalette: Failed to fetch projects/tasks", err);
        });
    }
  }, [open, user]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  if (!user) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="sr-only" role="heading" aria-level="1">
        Command Palette
      </div>
      <div className="sr-only">Search for projects, tasks, and actions</div>
      <CommandInput
        placeholder="Search anything — projects, tasks, actions…"
        data-testid="command-input"
      />
      <CommandList>
        <CommandEmpty>Nothing found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/projects")}>
            <FolderKanban className="mr-2 h-4 w-4" /> Projects
            <CommandShortcut>G P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/my-tasks")}>
            <ListChecks className="mr-2 h-4 w-4" /> My tasks
            <CommandShortcut>G T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/members")}>
            <Users className="mr-2 h-4 w-4" /> Team
          </CommandItem>
        </CommandGroup>

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.slice(0, 8).map((p) => (
                <CommandItem
                  key={p.id}
                  value={`project ${p.title}`}
                  onSelect={() => go(`/projects/${p.id}`)}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  {p.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {tasks.slice(0, 10).map((t) => (
                <CommandItem
                  key={t.id}
                  value={`task ${t.title}`}
                  onSelect={() => go(`/projects/${t.project_id}`)}
                >
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              toggle();
            }}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            Toggle theme
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
