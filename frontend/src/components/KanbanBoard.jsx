import React, { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  Flag,
  MoreHorizontal,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import UserAvatar from "./UserAvatar";
import { Badge } from "./ui/badge";
import { InlineEditableTitle } from "./InlineEditableTitle";
import { SubtaskList } from "./SubtaskList";
import { EmptyState, KanbanEmptyIllustration } from "./EmptyState";
import {
  PRIORITY_STYLES,
  STATUS_LABEL,
  formatDate,
  isOverdue,
} from "../lib/taskHelpers";
import { celebrateTaskCompletion } from "../lib/celebrations";

const COLUMNS = [
  { id: "todo", title: "Todo", hint: "Not started" },
  { id: "in_progress", title: "In Progress", hint: "Active work" },
  { id: "done", title: "Done", hint: "Shipped" },
];

function TaskCard({
  task,
  userMap,
  onEdit,
  onDelete,
  onTitleChange,
  onSubtaskAdd,
  onSubtaskToggle,
  onSubtaskDelete,
  canManage,
  dragging,
}) {
  const overdue = isOverdue(task);
  const assignee = userMap[task.assigned_to];
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  return (
    <div
      className={`group rounded-2xl border bg-card p-4 card-soft transition-all duration-200 hover:-translate-y-0.5 ${
        overdue ? "border-rose-500/40" : "border-border"
      } ${dragging ? "opacity-50" : ""}`}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <InlineEditableTitle
            value={task.title}
            isEditing={isEditingTitle}
            setIsEditing={setIsEditingTitle}
            onSave={(newTitle) => onTitleChange?.(task.id, newTitle)}
          />
          {task.description && (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {task.description}
            </div>
          )}

          {/* Subtasks */}
          {(task.subtasks?.length > 0 || canManage) && (
            <SubtaskList
              task={task}
              onSubtaskAdd={(title) => onSubtaskAdd?.(task.id, title)}
              onSubtaskToggle={(subtaskId) =>
                onSubtaskToggle?.(task.id, subtaskId)
              }
              onSubtaskDelete={(subtaskId) =>
                onSubtaskDelete?.(task.id, subtaskId)
              }
              canManage={canManage}
            />
          )}
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                data-no-card-click
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                data-testid={`task-menu-${task.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={() => onEdit(task)}
                data-testid={`task-edit-${task.id}`}
              >
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
          <Badge
            variant="outline"
            className={`${PRIORITY_STYLES[task.priority]} gap-1 font-mono text-[10px]`}
          >
            <Flag className="h-2.5 w-2.5" />
            {task.priority}
          </Badge>
          {task.due_date && (
            <Badge
              variant="outline"
              className={`gap-1 font-mono text-[10px] ${overdue ? "border-red-500/40 text-red-400" : ""}`}
            >
              {overdue ? (
                <AlertCircle className="h-2.5 w-2.5" />
              ) : (
                <CalendarDays className="h-2.5 w-2.5" />
              )}
              {formatDate(task.due_date)}
            </Badge>
          )}
        </div>
        {assignee ? (
          <UserAvatar user={assignee} size="xs" />
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            unassigned
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableTask({ task, onOpen, ...rest }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // ignore clicks coming from the dropdown menu
        if (e.target.closest("[data-no-card-click]")) return;
        if (!isDragging) onOpen?.(task);
      }}
      className="touch-none cursor-pointer"
    >
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
      className={`flex h-full min-h-[60vh] flex-col rounded-2xl border bg-muted/40 p-4 transition-colors ${
        isOver ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="mb-4 flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                column.id === "todo"
                  ? "bg-zinc-400"
                  : column.id === "in_progress"
                    ? "bg-sky-500"
                    : "bg-primary"
              }`}
            />
            {column.title}
            <span className="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {tasks.length}
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {column.hint}
          </div>
        </div>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {tasks.length === 0 && (
            <div className="rounded-md border-2 border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              <KanbanEmptyIllustration />
              <p className="text-xs">Drop tasks here to organize your work</p>
            </div>
          )}
          {tasks.map((task) => (
            <DraggableTask key={task.id} task={task} {...rest} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({
  tasks,
  users,
  onStatusChange,
  onEdit,
  onDelete,
  onTitleChange,
  onSubtaskAdd,
  onSubtaskToggle,
  onSubtaskDelete,
  onReorder,
  onOpen,
  canManage,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [activeId, setActiveId] = useState(null);
  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  const grouped = useMemo(() => {
    const g = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) {
      g[t.status]?.push(t);
    }
    // Sort each column by order, then by created_at for stable sorting
    for (const status in g) {
      g[status].sort((a, b) => {
        const orderDiff = (a.order || 0) - (b.order || 0);
        if (orderDiff !== 0) return orderDiff;
        // Secondary sort by creation time for deterministic ordering
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });
    }
    return g;
  }, [tasks]);

  const onDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const destinationStatus = ["todo", "in_progress", "done"].includes(over.id)
      ? over.id
      : overTask?.status;

    if (!destinationStatus) return;

    if (destinationStatus !== task.status) {
      // Column change: dropping on a column or a task in another column.
      if (destinationStatus === "done") {
        celebrateTaskCompletion(task.title);
      }
      onStatusChange(task, destinationStatus);
      return;
    }

    if (over.id === task.id) return;

    // Position change (reorder within same column)
    const columnTasks = grouped[destinationStatus];
    if (!columnTasks || columnTasks.length === 0) return;

    const overTaskIndex = columnTasks.findIndex((t) => t.id === over.id);

    if (overTaskIndex >= 0) {
      // Call reorder API with new position
      onReorder?.(task.id, overTaskIndex);
    }
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
            onTitleChange={onTitleChange}
            onSubtaskAdd={onSubtaskAdd}
            onSubtaskToggle={onSubtaskToggle}
            onSubtaskDelete={onSubtaskDelete}
            onOpen={onOpen}
            canManage={canManage}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            userMap={userMap}
            onEdit={() => {}}
            onDelete={() => {}}
            onSubtaskAdd={() => {}}
            onSubtaskToggle={() => {}}
            onSubtaskDelete={() => {}}
            canManage={false}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
