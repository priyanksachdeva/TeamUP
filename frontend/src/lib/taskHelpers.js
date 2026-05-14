// Tiny utilities used across the app
export const PRIORITY_STYLES = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

export const STATUS_STYLES = {
  todo: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export const STATUS_LABEL = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

export const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("") || "U";
}

export function avatarColor(seed = "") {
  const palette = [
    "bg-blue-500/20 text-blue-300",
    "bg-emerald-500/20 text-emerald-300",
    "bg-amber-500/20 text-amber-300",
    "bg-purple-500/20 text-purple-300",
    "bg-pink-500/20 text-pink-300",
    "bg-cyan-500/20 text-cyan-300",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function isOverdue(task) {
  if (!task?.due_date || task.status === "done") return false;
  return new Date(task.due_date).getTime() < Date.now();
}
