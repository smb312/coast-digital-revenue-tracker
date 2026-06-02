import { createClient } from "@/lib/supabase/server";

// Step 1 landing page: confirms the app renders and the server-side Supabase
// client is wired up. This becomes the authenticated dashboard in later steps.
export default async function HomePage() {
  // Touch the server client so we know the SSR wiring + env vars resolve.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Coast Digital
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Revenue Tracker
        </h1>
        <p className="mt-2 text-slate-600">
          Monthly profit forecasting. Scaffold is live and Supabase is wired up.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Setup status</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span> Next.js + TypeScript +
            Tailwind scaffold
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span> Supabase SSR clients
            (server + browser) and middleware
          </li>
          <li className="flex items-center gap-2">
            <span className={user ? "text-green-600" : "text-slate-400"}>
              {user ? "✓" : "○"}
            </span>
            Auth session{" "}
            {user ? `active (${user.email})` : "not signed in (added in step 2)"}
          </li>
        </ul>
      </div>

      <p className="text-xs text-slate-400">
        Next up: email auth + route protection.
      </p>
    </main>
  );
}
