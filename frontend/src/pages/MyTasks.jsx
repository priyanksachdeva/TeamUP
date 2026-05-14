import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { ListChecks, Flame, CalendarClock, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { PRIORITY_STYLES, STATUS_LABEL, formatDate, isOverdue } from "../lib/taskHelpers";
import TaskDetailDrawer from "../components/TaskDetailDrawer";

const STATUS_DOT = {
  todo: "bg-zinc-400",
  in_progress: "bg-sky-500",
  done: "bg-primary",
};

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }

function bucket(task) {
  if (task.status === "done") return "done";
  if (!task.due_date) return "upcoming";
  const today = startOfDay(new Date());
  const due = startOfDay(task.due_date);
  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  return "upcoming";
}

function TaskRow({ task, projectMap, onClick }) {
  const overdue = isOverdue(task);
  return (
    <button
      onClick={onClick}
      data-testid={`my-task-${task.id}`}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors duration-200 hover:bg-accent"
    >
      <span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[task.status]}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{task.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {projectMap[task.project_id]?.title || "Project"} · {STATUS_LABEL[task.status]}
        </div>
      </div>
      <Badge variant="outline" className={`${PRIORITY_STYLES[task.priority]} hidden rounded-full font-mono text-[10px] sm:inline-flex`}>
        {task.priority}
      </Badge>
      {task.due_date && (
        <Badge variant="outline" className={`gap-1 rounded-full font-mono text-[10px] ${overdue ? "border-rose-500/30 text-rose-500" : ""}`}>
          {overdue && <AlertCircle className="h-2.5 w-2.5" />}
          {formatDate(task.due_date)}
        </Badge>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
    </button>
  );
}

function Section({ items, projectMap, openTask, empty }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((t) => (
        <TaskRow key={t.id} task={t} projectMap={projectMap} onClick={() => openTask(t)} />
      ))}
    </div>
  );
}

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, p, u] = await Promise.all([
        api.get("/tasks"),
        api.get("/projects"),
        api.get("/users"),
      ]);
      setTasks(t.data); setProjects(p.data); setUsers(u.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);

  const mine = useMemo(
    () => tasks.filter((t) => t.assigned_to === user?.id),
    [tasks, user]
  );

  const today = mine.filter((t) => bucket(t) === "today");
  const upcoming = mine.filter((t) => bucket(t) === "upcoming");
  const overdue = mine.filter((t) => bucket(t) === "overdue");
  const done = mine.filter((t) => bucket(t) === "done").slice(0, 30);

  const openTask = (t) => { setActiveTaskId(t.id); setDrawerOpen(true); };

  if (loading) {
    return (
      <div className="space-y-4">
        {[0,1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="my-tasks-page">
      <div>
        <div className="eyebrow">Personal</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">My tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything assigned to you, across every project.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="card-soft rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><CalendarClock className="h-4 w-4" /></div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Today</div>
              <div className="font-display text-2xl font-bold tabular-nums">{String(today.length).padStart(2,"0")}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-soft rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/10 text-sky-500"><ListChecks className="h-4 w-4" /></div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Upcoming</div>
              <div className="font-display text-2xl font-bold tabular-nums">{String(upcoming.length).padStart(2,"0")}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-soft rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10 text-rose-500"><Flame className="h-4 w-4" /></div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Overdue</div>
              <div className="font-display text-2xl font-bold tabular-nums">{String(overdue.length).padStart(2,"0")}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-soft rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Done</div>
              <div className="font-display text-2xl font-bold tabular-nums">{String(done.length).padStart(2,"0")}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="rounded-full bg-muted p-1">
          <TabsTrigger value="today" className="rounded-full" data-testid="tab-today">Today · {today.length}</TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-full" data-testid="tab-upcoming">Upcoming · {upcoming.length}</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-full" data-testid="tab-overdue">Overdue · {overdue.length}</TabsTrigger>
          <TabsTrigger value="done" className="rounded-full" data-testid="tab-done">Done · {done.length}</TabsTrigger>
        </TabsList>
        <TabsContent value="today"><Section items={today} projectMap={projectMap} openTask={openTask} empty="Nothing for today. Enjoy a calm focus block." /></TabsContent>
        <TabsContent value="upcoming"><Section items={upcoming} projectMap={projectMap} openTask={openTask} empty="No upcoming tasks assigned to you." /></TabsContent>
        <TabsContent value="overdue"><Section items={overdue} projectMap={projectMap} openTask={openTask} empty="You're all caught up. 🎉" /></TabsContent>
        <TabsContent value="done"><Section items={done} projectMap={projectMap} openTask={openTask} empty="No completed tasks yet." /></TabsContent>
      </Tabs>

      <TaskDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        taskId={activeTaskId}
        users={users}
        currentUser={user}
        isAdmin={user?.role === "admin"}
        onTaskUpdated={(t) => setTasks((all) => all.map((x) => (x.id === t.id ? t : x)))}
        onTaskDeleted={(id) => setTasks((all) => all.filter((x) => x.id !== id))}
      />
    </div>
  );
}
