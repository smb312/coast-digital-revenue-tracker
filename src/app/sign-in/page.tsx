"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

function AuthForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setPending(false);
      if (error) {
        setError(error.message);
        return;
      }
      // Full navigation so the server re-reads the refreshed auth cookies.
      window.location.assign(next);
      return;
    }

    // sign-up: create the account with a password.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next
        )}`,
      },
    });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation is off — we're signed in immediately.
      window.location.assign(next);
    } else {
      // Confirmation required: user must click the email link once.
      setNotice(
        "Account created. Check your email to confirm it, then sign in."
      );
      setMode("sign-in");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Coast Digital
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Revenue Tracker
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "sign-in" ? "Sign in to continue." : "Create your account."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "sign-up" ? "At least 6 characters" : "••••••••"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending
              ? mode === "sign-in"
                ? "Signing in…"
                : "Creating account…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          {mode === "sign-in" ? (
            <>
              Need to set up your account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setError(null);
                  setNotice(null);
                }}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setError(null);
                  setNotice(null);
                }}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
