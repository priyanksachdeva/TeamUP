import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FolderKanban, MoreHorizontal, Pencil, Trash2, Search, Users as UsersIcon } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";
import api, { formatApiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "../components/UserAvatar";
import ProjectDialog from "../components/ProjectDialog";
import { formatDate } from "../lib/taskHelpers";

export default function Projects() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([api.get("/projects"), api.get("/users")]);
      setProjects(p.data);
      setUsers(u.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const filtered = projects.filter((p) =>
    `${p.title} ${p.description}`.toLowerCase().includes(query.toLowerCase())
  );

  const confirmDelete = async () => {
    try {
      await api.delete(`/projects/${deleting.id}`);
      toast.success("Project deleted");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="space-y-6" data-testid="projects-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All active workstreams in your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-44 pl-8 sm:w-64"
              data-testid="projects-search"
            />
          </div>
          {isAdmin && (
            <Button
              onClick={() => { setEditing(null); setDialogOpen(true); }}
              className="gap-1.5"
              data-testid="projects-new-button"
            >
              <Plus className="h-4 w-4" /> New project
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
            <div className="font-display text-lg">No projects yet</div>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Create your first project to start planning." : "You haven't been added to any projects yet."}
            </p>
            {isAdmin && (
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="mt-2">
                <Plus className="mr-1.5 h-4 w-4" /> Create project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="group transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
              data-testid={`project-card-${p.id}`}
            >
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/projects/${p.id}`}
                      className="block truncate font-display text-lg font-semibold tracking-tight hover:underline"
                    >
                      {p.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.description || "No description."}
                    </p>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`project-menu-${p.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(p); setDialogOpen(true); }}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500"
                          onClick={() => setDeleting(p)}
                          data-testid={`project-delete-${p.id}`}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between pt-5">
                  <div className="flex -space-x-2">
                    {(p.members || []).slice(0, 4).map((id) => {
                      const u = userMap[id];
                      return u ? <UserAvatar key={id} user={u} size="xs" className="ring-2 ring-card" /> : null;
                    })}
                    {(p.members || []).length > 4 && (
                      <div className="z-10 ml-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[10px] text-muted-foreground">
                        +{p.members.length - 4}
                      </div>
                    )}
                    {(p.members || []).length === 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <UsersIcon className="h-3 w-3" /> No members
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {formatDate(p.created_at)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editing}
        users={users}
        onSaved={load}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" and all its tasks will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="project-confirm-delete"
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
