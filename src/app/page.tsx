import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";

// Protected dashboard (placeholder until step 4). Middleware already redirects
// logged-out users, but we re-check here as defense in depth and to get the
// user record for the header.
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-slate-600">
          You&apos;re signed in. The KPI strip, forecast chart, and P&amp;L
          table arrive in step 4.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">
            Setup status
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span> Scaffold + Supabase
              wiring
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span> Email magic-link auth +
              route protection
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-400">○</span> Line Items CRUD (next)
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
