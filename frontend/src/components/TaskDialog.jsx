import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import api, { formatApiError } from "../services/api";

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function TaskDialog({ open, onOpenChange, task, projectId, members, onSaved }) {
  const isEdit = Boolean(task);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
    status: "todo",
    due_date: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        title: task?.title || "",
        description: task?.description || "",
        assigned_to: task?.assigned_to || "",
        priority: task?.priority || "medium",
        status: task?.status || "todo",
        due_date: toDateInput(task?.due_date),
      });
    }
  }, [open, task]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        assigned_to: form.assigned_to || null,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      };
      if (isEdit) {
        await api.put(`/tasks/${task.id}`, payload);
        toast.success("Task updated");
      } else {
        await api.post("/tasks", { ...payload, project_id: projectId });
        toast.success("Task created");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="task-dialog">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display">{isEdit ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Refine details, owner, and timing." : "Create a task and assign an owner."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Ship login flow"
                data-testid="task-title-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Details, acceptance criteria, etc."
                rows={3}
                data-testid="task-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Select
                  value={form.assigned_to || "unassigned"}
                  onValueChange={(v) => setForm({ ...form, assigned_to: v === "unassigned" ? "" : v })}
                >
                  <SelectTrigger data-testid="task-assignee-select">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger data-testid="task-priority-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="task-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due_date">Due date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  data-testid="task-due-input"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} data-testid="task-submit-button">
              {loading ? "Saving..." : isEdit ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
