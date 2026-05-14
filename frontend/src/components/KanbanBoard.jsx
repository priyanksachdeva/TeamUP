import React, { useMemo, useState } from "react";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCorners, DragOverlay,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CalendarDays, Flag, MoreHorizontal, AlertCircle, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import UserAvatar from "./UserAvatar";
import { Badge } from "./ui/badge";
import { PRIORITY_STYLES, STATUS_LABEL, formatDate, isOverdue } from "../lib/taskHelpers";

const COLUMNS = [
  { id: "todo", title: "Todo", hint: "Not started" },
  { id: "in_progress", title: "In Progress", hint: "Active work" },
  { id: "done", title: "Done", hint: "Shipped" },
];

function TaskCard({ task, userMap, onEdit, onDelete, canManage, dragging }) {
  const overdue = isOverdue(task);
  const assignee = userMap[task.assigned_to];
  return (
    <div
      className={`group rounded-lg border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        overdue ? "border-red-500/40" : "border-border"
      } ${dragging ? "opacity-50" : ""}`}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</div>
          {task.description && (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</div>
          )}
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                data-testid={`task-menu-${task.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onPointerDown={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(task)} data-testid={`task-edit-${task.id}`}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onClick={() => onDelete(task)}
                data-testid={`task-delete-${task.id}`}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`${PRIORITY_STYLES[task.priority]} gap-1 font-mono text-[10px]`}>
            <Flag className="h-2.5 w-2.5" />
            {task.priority}
          </Badge>
          {task.due_date && (
            <Badge
              variant="outline"
              className={`gap-1 font-mono text-[10px] ${overdue ? "border-red-500/40 text-red-400" : ""}`}
            >
              {overdue ? <AlertCircle className="h-2.5 w-2.5" /> : <CalendarDays className="h-2.5 w-2.5" />}
              {formatDate(task.due_date)}
            </Badge>
          )}
        </div>
        {assignee ? <UserAvatar user={assignee} size="xs" /> : (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">unassigned</span>
        )}
      </div>
    </div>
  );
}

function DraggableTask({ task, ...rest }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="touch-none">
      <TaskCard task={task} dragging={isDragging} {...rest} />
    </div>
  );
}

function Column({ column, tasks, ...rest }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${column.id}`}
      className={`flex h-full min-h-[60vh] flex-col rounded-xl border bg-muted/30 p-3 transition-colors ${
        isOver ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            {column.title}
            <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {tasks.length}
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{column.hint}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {tasks.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Drop tasks here
          </div>
        )}
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} {...rest} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks, users, onStatusChange, onEdit, onDelete, canManage }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState(null);
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const grouped = useMemo(() => {
    const g = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) g[t.status]?.push(t);
    return g;
  }, [tasks]);

  const onDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    if (task.status !== over.id) onStatusChange(task, over.id);
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {COLUMNS.map((c) => (
          <Column
            key={c.id}
            column={c}
            tasks={grouped[c.id] || []}
            userMap={userMap}
            onEdit={onEdit}
            onDelete={onDelete}
            canManage={canManage}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} userMap={userMap} onEdit={() => {}} onDelete={() => {}} canManage={false} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
