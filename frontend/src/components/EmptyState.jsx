/**
 * Empty state illustrations and messages for various views
 */
import {
  FolderKanban,
  ListChecks,
  Users as UsersIcon,
  Inbox,
} from "lucide-react";

const ILLUSTRATIONS = {
  projects: {
    icon: FolderKanban,
    title: "No projects yet",
    description:
      "Create your first project to start collaborating with your team.",
  },
  tasks: {
    icon: ListChecks,
    title: "No tasks here",
    description:
      "All tasks are caught up! Create a new task or drag one here to get started.",
  },
  members: {
    icon: UsersIcon,
    title: "No team members",
    description: "Add team members to this project to start collaborating.",
  },
  inbox: {
    icon: Inbox,
    title: "All caught up",
    description: "No new notifications or tasks to review.",
  },
};

/**
 * Reusable empty state component with icon and message
 */
export function EmptyState({
  type = "tasks",
  title,
  description,
  children,
  actionButton,
}) {
  const illustration = ILLUSTRATIONS[type];
  const Icon = illustration?.icon;
  const displayTitle = title || illustration?.title;
  const displayDescription = description || illustration?.description;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 text-center rounded-lg border-2 border-dashed border-border bg-muted/20">
      {Icon && (
        <div className="rounded-full bg-muted p-3">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      <div className="max-w-sm space-y-2">
        <h3 className="font-display text-lg font-semibold">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground">{displayDescription}</p>
      </div>

      {children || actionButton}
    </div>
  );
}

/**
 * SVG Illustration components for visual variety
 */
export function KanbanEmptyIllustration() {
  return (
    <svg
      className="mx-auto mb-4 h-32 w-32 text-muted-foreground/30"
      fill="none"
      viewBox="0 0 200 160"
    >
      {/* Kanban columns */}
      <g>
        <rect
          x="10"
          y="20"
          width="50"
          height="130"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          rx="4"
        />
        <rect
          x="75"
          y="20"
          width="50"
          height="130"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          rx="4"
        />
        <rect
          x="140"
          y="20"
          width="50"
          height="130"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          rx="4"
        />

        {/* Column labels */}
        <text
          x="35"
          y="45"
          textAnchor="middle"
          className="fill-current text-xs"
        >
          Todo
        </text>
        <text
          x="100"
          y="45"
          textAnchor="middle"
          className="fill-current text-xs"
        >
          In Progress
        </text>
        <text
          x="165"
          y="45"
          textAnchor="middle"
          className="fill-current text-xs"
        >
          Done
        </text>

        {/* Add card icon in middle */}
        <circle
          cx="100"
          cy="100"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <line
          x1="100"
          y1="94"
          x2="100"
          y2="106"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <line
          x1="94"
          y1="100"
          x2="106"
          y2="100"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
      </g>
    </svg>
  );
}

export function ProjectsEmptyIllustration() {
  return (
    <svg
      className="mx-auto mb-4 h-32 w-32 text-muted-foreground/30"
      fill="none"
      viewBox="0 0 200 160"
    >
      {/* Folder */}
      <path
        d="M20 50h60l10-15h80v95H20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        rx="4"
      />
      {/* Plus sign */}
      <circle
        cx="100"
        cy="90"
        r="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <line
        x1="100"
        y1="80"
        x2="100"
        y2="100"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <line
        x1="90"
        y1="90"
        x2="110"
        y2="90"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
    </svg>
  );
}

export function TasksEmptyIllustration() {
  return (
    <svg
      className="mx-auto mb-4 h-32 w-32 text-muted-foreground/30"
      fill="none"
      viewBox="0 0 200 160"
    >
      {/* Checklist */}
      <g>
        <rect
          x="30"
          y="30"
          width="140"
          height="100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          rx="4"
        />

        {/* List items */}
        <circle cx="45" cy="50" r="3" fill="currentColor" />
        <line
          x1="55"
          y1="50"
          x2="155"
          y2="50"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />

        <circle cx="45" cy="75" r="3" fill="currentColor" />
        <line
          x1="55"
          y1="75"
          x2="155"
          y2="75"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />

        <circle cx="45" cy="100" r="3" fill="currentColor" />
        <line
          x1="55"
          y1="100"
          x2="155"
          y2="100"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Checkmark on one */}
        <circle
          cx="45"
          cy="125"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <path
          d="M43 125l1 2 2-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
      </g>
    </svg>
  );
}
