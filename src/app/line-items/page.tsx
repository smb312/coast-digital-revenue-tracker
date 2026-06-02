import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import LineItemsManager from "@/components/line-items/LineItemsManager";

// Forecast reads come from views, but Line Items management reads/writes the
// base table directly. Always render fresh data.
export const dynamic = "force-dynamic";

export default async function LineItemsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: items, error } = await supabase
    .from("line_items")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            Couldn&apos;t load line items: {error.message}
          </p>
        ) : (
          <LineItemsManager items={items ?? []} />
        )}
      </main>
    </div>
  );
}
