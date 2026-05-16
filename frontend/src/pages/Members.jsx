import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import api, { formatApiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "../components/UserAvatar";
import { formatDate } from "../lib/taskHelpers";

export default function Members() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setRole = async (u, role) => {
    try {
      await api.patch(`/users/${u.id}/role`, { role });
      toast.success(`${u?.name || "Member"} is now ${role}`);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="space-y-6" data-testid="members-page">
      <div>
        <div className="eyebrow">Team</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People with access to this workspace.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <Card
              key={u.id}
              data-testid={`member-card-${u.id}`}
              className="card-soft rounded-2xl transition-transform duration-200 hover:-translate-y-0.5"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <UserAvatar user={u} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-display text-base font-semibold">{u?.name || "Unknown"}</div>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] ${
                        u.role === "admin"
                          ? "border-primary/40 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {u.role}
                    </Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Joined {formatDate(u.created_at)}
                  </div>
                </div>
                {isAdmin && user.id !== u.id && (
                  <Select value={u.role} onValueChange={(v) => setRole(u, v)}>
                    <SelectTrigger className="h-8 w-28 text-xs" data-testid={`member-role-${u.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
