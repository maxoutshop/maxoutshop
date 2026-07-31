import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useSession } from "@/lib/auth";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Join MAXOUT — Member Access" },
      { name: "description", content: "Sign in to MAXOUT for workout tracking, meal logging, challenges and member rewards." },
      { property: "og:title", content: "Join MAXOUT — Member Access" },
      { property: "og:description", content: "Track training, log meals, join challenges and earn MAXOUT rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/profile", replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name || email.split("@")[0] } },
        });
        if (err) throw err;
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMessage("That email already has an account. Sign in, or use Set or reset password below.");
        } else if (!data.session) {
          setMessage("Account created. Sign in with your email and password.");

        } else {
          navigate({ to: "/profile", replace: true });
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Something went wrong.";
      if (/invalid login credentials/i.test(raw)) {
        setError("Wrong email or password. If you've never set one, use Set or reset password below.");
      } else {
        setError(raw);
      }
    } finally {
      setBusy(false);
    }
  }



  async function resetPassword() {
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter your email first, then tap Set a password.");
      return;
    }
    setResetBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetBusy(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage("Password setup link sent. Open the email, choose a password, then sign in here.");
  }


  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-accent">MAXOUT</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {mode === "signin" ? "Welcome back" : "Built for more"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Sign in to your training, nutrition and rewards."
          : "Create your account for tracking, challenges and member rewards."}
      </p>

      <div className="mt-7" />



      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm outline-none"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm outline-none"
        />
        <Button
          type="submit"
          disabled={busy}
          className="h-auto w-full rounded-full py-3.5"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {mode === "signin" && (
        <Button
          type="button"
          variant="link"
          disabled={resetBusy}
          onClick={resetPassword}
          className="mt-2 h-auto w-full py-2 text-xs text-muted-foreground"
        >
          {resetBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Set or reset password
        </Button>
      )}

      {error && <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">{error}</p>}
      {message && <p className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-xs text-muted-foreground">{message}</p>}

      <Button
        type="button"
        variant="link"
        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setMessage(null); }}
        className="mt-4 h-auto text-center text-xs text-muted-foreground"
      >
        {mode === "signin" ? "New here? Create an account" : "Already a member? Sign in"}
      </Button>
    </main>
  );
}
