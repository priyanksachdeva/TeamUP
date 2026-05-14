import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo, ArrowUpRight, TrendingUp,
} from "lucide-react";
import api from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import { PRIORITY_STYLES, STATUS_LABEL, formatDate, isOverdue } from "../lib/taskHelpers";

const COLORS = ["#71717a", "#3b82f6", "#10b981"]; // todo, in_progress, done

function StatCard({ label, value, accent, icon: Icon, testId, sub }) {
  return (
    <Card
      data-testid={testId}
      className="group relative overflow-hidden border-border transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">{label}</div>
            <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
            {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-md border ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [recent, setRecent] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, u, r, p, uu] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/dashboard/upcoming"),
          api.get("/dashboard/recent"),
          api.get("/projects"),
          api.get("/users"),
        ]);
        setStats(s.data);
        setUpcoming(u.data);
        setRecent(r.data);
        setProjects(p.data);
        setUsers(uu.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);

  if (loading || !stats) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Overview</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Hello, {user?.name?.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what your team is shipping right now.
          </p>
        </div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          data-testid="dashboard-projects-link"
        >
          Open projects <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total tasks"
          value={stats.total_tasks}
          icon={ListTodo}
          accent="bg-zinc-500/10 text-zinc-300 border-zinc-500/20"
          testId="stat-total"
          sub={`${stats.total_projects} active projects`}
        />
        <StatCard
          label="In progress"
          value={stats.in_progress_tasks}
          icon={Clock}
          accent="bg-blue-500/10 text-blue-400 border-blue-500/20"
          testId="stat-in-progress"
          sub={`${stats.todo_tasks} not started`}
        />
        <StatCard
          label="Completed"
          value={stats.completed_tasks}
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          testId="stat-completed"
          sub={stats.total_tasks > 0 ? `${Math.round((stats.completed_tasks / stats.total_tasks) * 100)}% complete` : "—"}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue_tasks}
          icon={AlertTriangle}
          accent="bg-red-500/10 text-red-400 border-red-500/20"
          testId="stat-overdue"
          sub={stats.overdue_tasks > 0 ? "Needs attention" : "All clear"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-display text-base">
              Status distribution
              <span className="eyebrow">Live</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.status_breakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="hsl(var(--background))"
                >
                  {stats.status_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              {stats.status_breakdown.map((s, i) => (
                <div key={s.key} className="rounded-md border border-border bg-background/40 p-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                    {s.name}
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold">{s.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-display text-base">
              <span className="inline-flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Productivity · last 7 days
              </span>
              <span className="eyebrow">Completed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.productivity} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--accent))" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-display text-base">
              Upcoming deadlines
              <Badge variant="outline" className="font-mono text-[10px]">{upcoming.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No upcoming deadlines.
              </div>
            )}
            {upcoming.map((t) => (
              <Link
                to={`/projects/${t.project_id}`}
                key={t.id}
                className="flex items-center justify-between rounded-md border border-border bg-background/40 p-3 transition-colors hover:bg-accent"
                data-testid={`upcoming-${t.id}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {projectMap[t.project_id]?.title || "Project"} · {STATUS_LABEL[t.status]}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`${isOverdue(t) ? "border-red-500/30 text-red-400" : ""} font-mono text-[11px]`}
                >
                  {formatDate(t.due_date)}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-display text-base">
              Recent activity
              <Badge variant="outline" className="font-mono text-[10px]">{recent.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No activity yet.
              </div>
            )}
            {recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border border-border bg-background/40 p-3"
                data-testid={`recent-${t.id}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {userMap[t.assigned_to]?.name || "Unassigned"} · {projectMap[t.project_id]?.title || "Project"}
                  </div>
                </div>
                <Badge variant="outline" className={`${PRIORITY_STYLES[t.priority]} font-mono text-[10px]`}>
                  {t.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Project progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.slice(0, 5).map((p) => {
              const ratio = stats.total_tasks ? Math.min(100, (stats.completed_tasks / Math.max(1, stats.total_tasks)) * 100) : 0;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <Link to={`/projects/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                    <span className="font-mono text-xs text-muted-foreground">{Math.round(ratio)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
