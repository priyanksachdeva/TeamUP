import React, { useState } from "react";
import { Check, Trash2, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";

/**
 * Subtask list component - displays and manages subtasks for a task
 */
export function SubtaskList({
  task,
  onSubtaskAdd,
  onSubtaskToggle,
  onSubtaskDelete,
  canManage,
}) {
  const subtasks = task.subtasks || [];
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    if (!canManage) {
      toast.error("Only admins can add subtasks");
      return;
    }

    setIsLoading(true);
    try {
      await onSubtaskAdd(newSubtaskTitle.trim());
      setNewSubtaskTitle("");
      setIsAdding(false);
    } catch (err) {
      // Error already handled by parent component's toast
      // Keep input for user to retry
    } finally {
      setIsLoading(false);
    }
  };

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;

  if (totalCount === 0 && !isAdding && !canManage) return null;

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-muted/30 p-3">
      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount} of {totalCount} subtasks
          </span>
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-green-500 transition-all"
              style={{
                width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1.5">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
          >
            <Checkbox
              checked={subtask.completed}
              onCheckedChange={() => onSubtaskToggle(subtask.id)}
              onClick={(e) => e.stopPropagation()}
              disabled={!canManage}
              className="h-4 w-4"
            />
            <span
              className={`flex-1 text-xs ${
                subtask.completed
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {subtask.title}
            </span>
            {canManage && (
              <button
                onClick={() => onSubtaskDelete(subtask.id)}
                aria-label={`Delete subtask: ${subtask.title}`}
                className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new subtask */}
      {canManage && (
        <div>
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Plus className="h-3 w-3" /> Add subtask
            </button>
          ) : (
            <div className="flex gap-1">
              <Input
                autoFocus
                placeholder="New subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) handleAddSubtask();
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewSubtaskTitle("");
                  }
                }}
                disabled={isLoading}
                className="h-7 text-xs disabled:opacity-50"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddSubtask}
                disabled={isLoading || !newSubtaskTitle.trim()}
                className="h-7 w-7 p-0"
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
