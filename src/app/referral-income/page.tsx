import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import WindowSelector from "@/components/dashboard/WindowSelector";
import ReferralChart, {
  type ReferralPoint,
} from "@/components/referral/ReferralChart";
import ReferralManager from "@/components/referral/ReferralManager";
import { buildMonths, parseWindow } from "@/lib/forecast";
import {
  amountColorClass,
  currentMonth,
  dateToMonthInput,
  formatCurrency,
  formatMonthLabel,
  formatMonthShort,
  monthInputToDate,
} from "@/lib/format";
import type { LineItem, MonthlyLedgerRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function ReferralIncomePage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const months = parseWindow((await searchParams).months);
  const start = currentMonth();
  const monthList = buildMonths(start, months);
  const startDate = monthInputToDate(monthList[0]);
  const endDate = monthInputToDate(monthList[monthList.length - 1]);

  const [itemsRes, ledgerRes] = await Promise.all([
    supabase
      .from("line_items")
      .select("*")
      .eq("category", "referral_revenue")
      .order("name", { ascending: true }),
    supabase
      .from("monthly_ledger")
      .select("*")
      .eq("category", "referral_revenue")
      .gte("month", startDate)
      .lte("month", endDate),
  ]);

  const loadError = itemsRes.error ?? ledgerRes.error;
  const items = (itemsRes.data ?? []) as LineItem[];
  const ledger = (ledgerRes.data ?? []) as MonthlyLedgerRow[];

  // Aggregate ledger into per-source rows and per-month totals.
  const monthsSet = new Set(monthList);
  const totalsByMonth = new Map<string, number>(monthList.map((m) => [m, 0]));
  const bySource = new Map<string, { name: string; byMonth: Map<string, number> }>();

  for (const row of ledger) {
    const ym = dateToMonthInput(row.month);
    if (!monthsSet.has(ym)) continue;
    const amt = Number(row.amount) || 0;
    totalsByMonth.set(ym, (totalsByMonth.get(ym) ?? 0) + amt);
    const src =
      bySource.get(row.line_item_id) ??
      { name: row.name, byMonth: new Map(monthList.map((m) => [m, 0])) };
    src.byMonth.set(ym, (src.byMonth.get(ym) ?? 0) + amt);
    bySource.set(row.line_item_id, src);
  }

  const monthLabels = monthList.map(formatMonthShort);
  const currentMonthIndex = monthList.indexOf(start);

  const chartData: ReferralPoint[] = monthList.map((m, i) => ({
    label: monthLabels[i],
    amount: totalsByMonth.get(m) ?? 0,
  }));

  const currentTotal = totalsByMonth.get(start) ?? 0;
  const windowTotal = monthList.reduce(
    (sum, m) => sum + (totalsByMonth.get(m) ?? 0),
    0
  );
  const activeCount = items.filter((i) => {
    const byMonth = bySource.get(i.id)?.byMonth;
    if (!byMonth) return false;
    for (const v of byMonth.values()) if (v !== 0) return true;
    return false;
  }).length;

  const projectionRows = Array.from(bySource.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Referral Income
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              A focused view of referral revenue over the next {months} months.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Window
            </span>
            <WindowSelector value={months} />
          </div>
        </div>

        {loadError ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            Couldn&apos;t load referral income: {loadError.message}
          </p>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  This month · {formatMonthLabel(start)}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {formatCurrency(currentTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Next {months} months
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {formatCurrency(windowTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Active sources
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {activeCount}
                </p>
              </div>
            </div>

            {/* Chart */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-slate-700">
                Referral income by month
              </h2>
              <div className="mt-3">
                <ReferralChart data={chartData} />
              </div>
            </section>

            {/* Per-source monthly projection */}
            {projectionRows.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-slate-700">
                  By source, month-by-month
                </h2>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="sticky left-0 z-10 bg-white px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Source
                        </th>
                        {monthLabels.map((label, i) => (
                          <th
                            key={i}
                            className={`px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide ${
                              i === currentMonthIndex
                                ? "bg-brand-50 text-brand-700"
                                : "text-slate-500"
                            }`}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {projectionRows.map((src, ri) => (
                        <tr key={ri} className="border-b border-slate-100">
                          <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-700">
                            {src.name}
                          </td>
                          {monthList.map((m, ci) => {
                            const v = src.byMonth.get(m) ?? 0;
                            return (
                              <td
                                key={ci}
                                className={`whitespace-nowrap px-4 py-2 text-right tabular-nums ${amountColorClass(v)} ${
                                  ci === currentMonthIndex ? "bg-brand-50/60" : ""
                                }`}
                              >
                                {formatCurrency(v)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="border-t-2 border-t-slate-300 bg-slate-50">
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-slate-50 px-4 py-2 font-bold text-slate-900">
                          Total Referral
                        </td>
                        {monthList.map((m, ci) => {
                          const v = totalsByMonth.get(m) ?? 0;
                          return (
                            <td
                              key={ci}
                              className={`whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums ${amountColorClass(v)} ${
                                ci === currentMonthIndex ? "bg-brand-50/60" : ""
                              }`}
                            >
                              {formatCurrency(v)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Editable sources */}
            <section>
              <ReferralManager items={items} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
