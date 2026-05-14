import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Users as UsersIcon, Pencil } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import api, { formatApiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "../components/UserAvatar";
import KanbanBoard from "../components/KanbanBoard";
import TaskDialog from "../components/TaskDialog";
import ProjectDialog from "../components/ProjectDialog";
import TaskDetailDrawer from "../components/TaskDetailDrawer";
import { formatDate } from "../lib/taskHelpers";

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [taskDialog, setTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [projectDialog, setProjectDialog] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, u] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?project_id=${id}`),
        api.get("/users"),
      ]);
      setProject(p.data);
      setTasks(t.data);
      setUsers(u.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const members = useMemo(
    () => users.filter((u) => (project?.members || []).includes(u.id)),
    [users, project]
  );

  const onStatusChange = async (task, newStatus) => {
    const previous = tasks;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: newStatus });
    } catch (err) {
      setTasks(previous);
      toast.error(formatApiError(err));
    }
  };

  const confirmDeleteTask = async () => {
    try {
      await api.delete(`/tasks/${deletingTask.id}`);
      toast.success("Task deleted");
      setDeletingTask(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (loading || !project) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-2/3" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="project-detail-page">
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to projects
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Project</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {project.title}
          </h1>
          {project.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-mono">Created {formatDate(project.created_at)}</Badge>
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="h-3 w-3" /> {members.length} members
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setProjectDialog(true)} data-testid="edit-project-button">
              <Pencil className="mr-1.5 h-4 w-4" /> Edit project
            </Button>
          )}
          {isAdmin && (
            <Button
              onClick={() => { setEditingTask(null); setTaskDialog(true); }}
              data-testid="new-task-button"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> New task
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="eyebrow mr-2">Team</div>
          {members.length === 0 && (
            <span className="text-xs text-muted-foreground">No members assigned.</span>
          )}
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 py-1 pl-1 pr-3"
              >
                <UserAvatar user={m} size="xs" />
                <span className="text-xs">{m.name}</span>
                <Badge variant="outline" className="font-mono text-[9px]">{m.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <KanbanBoard
        tasks={tasks}
        users={users}
        onStatusChange={onStatusChange}
        onEdit={(t) => { setEditingTask(t); setTaskDialog(true); }}
        onDelete={(t) => setDeletingTask(t)}
        onOpen={(t) => { setDrawerTaskId(t.id); setDrawerOpen(true); }}
        canManage={isAdmin}
      />

      <TaskDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        taskId={drawerTaskId}
        users={users}
        currentUser={user}
        isAdmin={isAdmin}
        onTaskUpdated={(t) => setTasks((all) => all.map((x) => (x.id === t.id ? t : x)))}
        onTaskDeleted={(tid) => setTasks((all) => all.filter((x) => x.id !== tid))}
        onEditFull={(t) => { setEditingTask(t); setTaskDialog(true); }}
      />

      <TaskDialog
        open={taskDialog}
        onOpenChange={setTaskDialog}
        task={editingTask}
        projectId={id}
        members={members}
        onSaved={load}
      />

      <ProjectDialog
        open={projectDialog}
        onOpenChange={setProjectDialog}
        project={project}
        users={users}
        onSaved={load}
      />

      <AlertDialog open={!!deletingTask} onOpenChange={(o) => !o && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingTask?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              data-testid="task-confirm-delete"
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
