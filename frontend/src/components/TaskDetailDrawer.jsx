import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { Flag, CalendarDays, User as UserIcon, Send, Trash2, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../services/api";
import UserAvatar from "./UserAvatar";
import { PRIORITY_STYLES, STATUS_LABEL, formatDate, isOverdue } from "../lib/taskHelpers";

const STATUS_DOT = {
  todo: "bg-zinc-400",
  in_progress: "bg-sky-500",
  done: "bg-primary",
};

function timeAgo(d) {
  if (!d) return "";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

export default function TaskDetailDrawer({
  open, onOpenChange, taskId, users, currentUser, isAdmin,
  onTaskUpdated, onTaskDeleted, onEditFull,
}) {
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        api.get(`/tasks?project_id=`).catch(() => ({ data: [] })), // best-effort, we'll filter below
        api.get(`/tasks/${taskId}/comments`),
      ]);
      // Pull the specific task from the tasks listing or fall back to projectDetail's list
      // To be robust, fetch comments + use the parent-provided task via onTaskUpdated callback
      // But simpler: just GET the single task — we don't have that endpoint; rely on parent's tasks list (pass via prop alt)
      setComments(cRes.data);
      // task is supplied externally; if not, derive from list
      const fromList = (tRes.data || []).find((t) => t.id === taskId);
      if (fromList) setTask(fromList);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Re-load whenever drawer opens or taskId changes
  useEffect(() => {
    if (open && taskId) load();
    if (!open) {
      setBody("");
      setTask(null);
      setComments([]);
    }
  }, [open, taskId, load]);

  // helper to refresh from server
  const refetchTask = useCallback(async () => {
    if (!taskId) return;
    try {
      const { data } = await api.get(`/tasks`);
      const found = data.find((t) => t.id === taskId);
      if (found) setTask(found);
    } catch (err) { /* ignore */ }
  }, [taskId]);

  // Initial: if parent didn't include task in tasks endpoint, fetch from /tasks (no filter)
  useEffect(() => {
    if (open && taskId && !task) refetchTask();
  }, [open, taskId, task, refetchTask]);

  const setStatus = async (newStatus) => {
    if (!task) return;
    try {
      const { data } = await api.patch(`/tasks/${task.id}/status`, { status: newStatus });
      setTask(data);
      toast.success(`Marked as ${STATUS_LABEL[newStatus]}`);
      onTaskUpdated?.(data);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const setAssignee = async (userId) => {
    if (!task || !isAdmin) return;
    try {
      const { data } = await api.put(`/tasks/${task.id}`, { assigned_to: userId === "unassigned" ? null : userId });
      setTask(data);
      onTaskUpdated?.(data);
      toast.success("Assignee updated");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const setPriority = async (p) => {
    if (!task || !isAdmin) return;
    try {
      const { data } = await api.put(`/tasks/${task.id}`, { priority: p });
      setTask(data);
      onTaskUpdated?.(data);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { body });
      setComments((c) => [...c, data]);
      setBody("");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (cid) => {
    try {
      await api.delete(`/comments/${cid}`);
      setComments((c) => c.filter((x) => x.id !== cid));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/tasks/${task.id}`);
      toast.success("Task deleted");
      setConfirmDelete(false);
      onOpenChange(false);
      onTaskDeleted?.(task.id);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
        data-testid="task-drawer"
      >
        {!task && loading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
        )}
        {task && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[task.status]}`} />
                <SheetDescription className="text-[10px] uppercase tracking-[0.18em] font-semibold">
                  {STATUS_LABEL[task.status]}
                </SheetDescription>
              </div>
              <SheetTitle className="font-display text-2xl leading-tight">
                {task.title}
              </SheetTitle>
              {task.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              )}
            </SheetHeader>

            <div className="my-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="eyebrow mb-1.5">Priority</div>
                {isAdmin ? (
                  <Select value={task.priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-8 border-none bg-transparent p-0 font-medium capitalize focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`${PRIORITY_STYLES[task.priority]} rounded-full font-mono text-[10px]`}>
                    <Flag className="mr-1 h-2.5 w-2.5" />
                    {task.priority}
                  </Badge>
                )}
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="eyebrow mb-1.5">Due</div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {isOverdue(task) ? <AlertCircle className="h-3.5 w-3.5 text-rose-500" /> : <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className={isOverdue(task) ? "text-rose-500" : ""}>{formatDate(task.due_date)}</span>
                </div>
              </div>
              <div className="col-span-2 rounded-xl border border-border bg-muted/40 p-3">
                <div className="eyebrow mb-2">Assignee</div>
                {isAdmin ? (
                  <Select value={task.assigned_to || "unassigned"} onValueChange={setAssignee}>
                    <SelectTrigger className="h-9 rounded-lg" data-testid="drawer-assignee-select">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : task.assigned_to && userMap[task.assigned_to] ? (
                  <div className="flex items-center gap-2">
                    <UserAvatar user={userMap[task.assigned_to]} size="xs" />
                    <span className="text-sm font-medium">{userMap[task.assigned_to].name}</span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <UserIcon className="h-3 w-3" /> Unassigned
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="eyebrow mb-2">Move to</div>
              <div className="flex flex-wrap gap-2">
                {["todo", "in_progress", "done"].map((s) => (
                  <Button
                    key={s}
                    variant={task.status === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatus(s)}
                    data-testid={`drawer-status-${s}`}
                    className="rounded-full"
                  >
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
                    {STATUS_LABEL[s]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-display font-semibold">Comments</div>
                <Badge variant="outline" className="rounded-full font-mono text-[10px]">{comments.length}</Badge>
              </div>

              <div className="space-y-3" data-testid="comments-list">
                {comments.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                    Be the first to leave a comment.
                  </div>
                )}
                {comments.map((c) => {
                  const own = c.user_id === currentUser?.id;
                  return (
                    <div key={c.id} className="rounded-xl border border-border bg-card p-3" data-testid={`comment-${c.id}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserAvatar user={{ name: c.user_name }} size="xs" />
                          <span className="text-xs font-semibold">{c.user_name}</span>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {timeAgo(c.created_at)}
                          </span>
                        </div>
                        {(own || isAdmin) && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            data-testid={`comment-delete-${c.id}`}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={submitComment} className="mt-4">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a comment…"
                  rows={2}
                  className="rounded-xl"
                  data-testid="comment-input"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitComment(e);
                  }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">⌘ + Enter to send</span>
                  <Button
                    type="submit"
                    disabled={!body.trim() || submitting}
                    size="sm"
                    className="gap-1.5 rounded-full"
                    data-testid="comment-submit"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? "Sending…" : "Comment"}
                  </Button>
                </div>
              </form>
            </div>

            {isAdmin && (
              <div className="mt-8 flex items-center gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onOpenChange(false); onEditFull?.(task); }}
                  data-testid="drawer-edit-full"
                  className="rounded-full"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit details
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="ml-auto rounded-full text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                  data-testid="drawer-delete"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete task
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription>
              "{task?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700" data-testid="drawer-delete-confirm">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
