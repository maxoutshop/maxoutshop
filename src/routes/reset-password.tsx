import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set Password — MAXOUT" },
      { name: "description", content: "Securely set a new password for your MAXOUT member account." },
      { property: "og:title", content: "Set Password — MAXOUT" },
      { property: "og:description", content: "Securely set a new password for your MAXOUT member account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const recoveryHash = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const recoveryQuery = new URLSearchParams(window.location.search).has("code");

    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session) && (recoveryHash || recoveryQuery));
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate({ to: "/profile", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link to="/auth" className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-accent">MAXOUT</p>
      <h1 className="mt-2 text-3xl font-semibold">Set your password</h1>
      <p className="mt-2 text-sm text-muted-foreground">Choose a secure password for email sign-in.</p>

      {ready ? (
        <form onSubmit={submit} className="mt-7 space-y-3">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm outline-none"
          />
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm outline-none"
          />
          <Button type="submit" disabled={busy} className="h-auto w-full rounded-full py-3.5">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save password
          </Button>
        </form>
      ) : (
        <p className="mt-7 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          This password link is invalid or expired. Request a new one from the sign-in screen.
        </p>
      )}

      {error && <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">{error}</p>}
    </main>
  );
}