import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import UserAvatar from "./UserAvatar";
import { toast } from "sonner";
import api, { formatApiError } from "../services/api";

export default function ProjectDialog({
  open,
  onOpenChange,
  project,
  users,
  onSaved,
}) {
  const isEdit = Boolean(project);
  const [form, setForm] = useState({ title: "", description: "", members: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        title: project?.title || "",
        description: project?.description || "",
        members: project?.members || [],
      });
    }
  }, [open, project]);

  const toggleMember = (id) => {
    setForm((f) => ({
      ...f,
      members: f.members.includes(id)
        ? f.members.filter((m) => m !== id)
        : [...f.members, id],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/projects/${project.id}`, form);
        toast.success("Project updated");
      } else {
        await api.post("/projects", form);
        toast.success("Project created");
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
      <DialogContent className="max-w-lg" data-testid="project-dialog">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEdit ? "Edit project" : "New project"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update project details and team."
                : "Spin up a workspace for your team."}
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
                placeholder="Q1 Launch"
                data-testid="project-title-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What is this project about?"
                rows={3}
                data-testid="project-description-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Members</Label>
              <ScrollArea className="h-48 rounded-md border border-border p-2">
                <div className="space-y-1">
                  {(users || []).filter(Boolean).map((u) => {
                    const checked = form.members.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleMember(u.id)}
                        data-testid={`project-member-${u.id}`}
                        className={`flex w-full items-center justify-between rounded-md border p-2 text-left transition-colors ${
                          checked
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserAvatar user={u} size="xs" />
                          <div>
                            <div className="text-sm">
                              {u?.name || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {u?.email || ""}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {u.role}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              data-testid="project-submit-button"
            >
              {loading
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
