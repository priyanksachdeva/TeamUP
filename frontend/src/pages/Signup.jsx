import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Hexagon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../services/api";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/1909a152-48a4-40d9-9502-a49c6af122f2/images/25885a7bf3ecbcf77e892e75e631df60696ddfe8a713939e3566f4d903d0386d.png";

export default function Signup() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  if (user && user !== false) return <Navigate to="/dashboard" replace />;

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const u = await signup(
        form.name.trim(),
        form.email.trim(),
        form.password,
      );
      toast.success(`Welcome, ${u.name}`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
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
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_hsl(244_76%_59%/0.55)]">
              <Hexagon className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">
              TeamUP
            </span>
          </div>

          <div className="rounded-3xl border border-white/20 bg-card/80 p-7 card-soft backdrop-blur-xl backdrop-saturate-150">
            <div className="mb-6">
              <div className="eyebrow mb-2">Get started</div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Create your account
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Spin up your team workspace in seconds.
              </p>
            </div>

            <form
              onSubmit={submit}
              className="space-y-4"
              data-testid="signup-form"
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={setField("name")}
                  required
                  data-testid="signup-name-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={setField("email")}
                  required
                  data-testid="signup-email-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={setField("password")}
                  required
                  data-testid="signup-password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                data-testid="signup-submit-button"
                className="h-11 w-full gap-2 rounded-full shadow-[0_8px_24px_-6px_hsl(244_76%_59%/0.55)]"
              >
                {loading ? "Creating account..." : "Create account"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-foreground underline-offset-4 hover:underline"
                data-testid="signup-login-link"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
