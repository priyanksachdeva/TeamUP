import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Hexagon, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../services/api";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/1909a152-48a4-40d9-9502-a49c6af122f2/images/25885a7bf3ecbcf77e892e75e631df60696ddfe8a713939e3566f4d903d0386d.png";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user && user !== false) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome back, ${u.name}`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === "admin") {
      setEmail("admin@demo.com");
      setPassword("Admin@123");
    } else {
      setEmail("member@demo.com");
      setPassword("Member@123");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <img
        src={BG_URL}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      <div className="absolute inset-0 auth-overlay" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2 text-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_hsl(244_76%_59%/0.55)]">
              <Hexagon className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">
              TeamUP
            </span>
          </div>

          <div className="rounded-3xl border border-white/20 bg-card/80 p-7 card-soft backdrop-blur-xl backdrop-saturate-150">
            <div className="mb-6">
              <div className="eyebrow mb-2">Sign in</div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Continue to your workspace.
              </p>
            </div>

            <form
              onSubmit={submit}
              className="space-y-4"
              data-testid="login-form"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="login-password-input"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                data-testid="login-submit-button"
                className="h-11 w-full gap-2 rounded-full shadow-[0_8px_24px_-6px_hsl(244_76%_59%/0.55)]"
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span className="uppercase tracking-[0.18em]">Try demo</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemo("admin")}
                data-testid="login-demo-admin"
                className="rounded-full font-mono text-xs"
              >
                Admin demo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemo("member")}
                data-testid="login-demo-member"
                className="rounded-full font-mono text-xs"
              >
                Member demo
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link
                to="/signup"
                className="text-foreground underline-offset-4 hover:underline"
                data-testid="login-signup-link"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
