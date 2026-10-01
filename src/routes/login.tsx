import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MarketingLayout } from "@/components/MarketingLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Connectly" },
      {
        name: "description",
        content:
          "Log in to Connectly to manage your jobs, applications and messages in Belhar, Cape Town.",
      },
      { property: "og:title", content: "Log in to Connectly" },
      { property: "og:description", content: "Access your Connectly dashboard." },
    ],
  }),
  component: Login,
});

function Login() {
  const [role, setRole] = useState<"member" | "worker">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const redirectAuthenticatedUser = useCallback(
    async (userId: string, email: string | null, metadataRole: unknown) => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;

      const accountRole = profile?.role ?? metadataRole;
      if (accountRole !== "member" && accountRole !== "worker") {
        throw new Error("This account doesn't have a valid Connectly role. Contact support.");
      }
      queryClient.setQueryData(["auth", "user"], { id: userId, email });
      await queryClient.removeQueries({ queryKey: ["profile", userId] });
      await navigate({
        to: accountRole === "worker" ? "/worker/dashboard" : "/member/dashboard",
        replace: true,
      });
    },
    [navigate, queryClient],
  );

  useEffect(() => {
    let active = true;
    void supabase.auth
      .getSession()
      .then(async ({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        const user = data.session?.user;
        if (active && user) {
          await redirectAuthenticatedUser(user.id, user.email ?? null, user.user_metadata["role"]);
        }
      })
      .catch((sessionError: unknown) => {
        if (active) {
          setError(
            sessionError instanceof Error
              ? sessionError.message
              : "We couldn't verify your session. Please try again.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [redirectAuthenticatedUser]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      await redirectAuthenticatedUser(
        data.user.id,
        data.user.email ?? null,
        data.user.user_metadata["role"] ?? role,
      );
    } catch (signInError) {
      setError(
        signInError instanceof Error ? signInError.message : "We couldn't sign you in. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    const email = form
      ? String(new FormData(form).get("email") ?? "")
          .trim()
          .toLowerCase()
      : "";
    if (!email) {
      setError("Enter your email address first, then select Forgot password.");
      setMessage(null);
      return;
    }

    setError(null);
    setMessage(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/profile?reset-password=true`,
      });
      if (resetError) throw resetError;
      setMessage("If an account exists for this email, a password reset link has been sent.");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "We couldn't send a password reset email. Please try again.",
      );
    }
  };

  return (
    <MarketingLayout>
      <section className="bg-[linear-gradient(150deg,var(--primary),var(--primary-dark))] text-white">
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
          <h1 className="font-display text-3xl font-extrabold">Welcome back</h1>
          <p className="mt-2 text-sm text-white/80">Log in to continue on Connectly.</p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-white/15 p-1">
            {(["member", "worker"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
                  role === r ? "bg-surface text-primary shadow-[var(--shadow-card)]" : "text-white"
                }`}
              >
                {r === "member" ? "Community Member" : "Worker"}
              </button>
            ))}
          </div>

          <form className="card-surface mt-6 space-y-5 p-6 text-foreground" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Email address</span>
              <input
                className="field"
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.co.za"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Password</span>
              <input
                className="field"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </label>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  name="rememberMe"
                  className="h-4 w-4 accent-[var(--primary)]"
                />{" "}
                Remember me
              </label>
              <button
                type="button"
                onClick={handlePasswordReset}
                className="font-semibold text-primary"
              >
                Forgot password?
              </button>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {message ? (
              <p role="status" className="text-sm text-primary">
                {message}
              </p>
            ) : null}
            <button disabled={isSubmitting} type="submit" className="btn-primary w-full">
              {isSubmitting
                ? "Signing in…"
                : `Log in as ${role === "member" ? "Community Member" : "Worker"}`}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              New to Connectly?{" "}
              <Link to="/signup" className="font-semibold text-primary">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}
