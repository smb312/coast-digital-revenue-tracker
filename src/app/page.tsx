import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import KpiStrip from "@/components/dashboard/KpiStrip";
import ForecastChart, {
  type ChartPoint,
} from "@/components/dashboard/ForecastChart";
import PnlTable, { type PnlRow } from "@/components/dashboard/PnlTable";
import WindowSelector from "@/components/dashboard/WindowSelector";
import {
  buildMonths,
  categoryHasActivity,
  ledgerByCategory,
  parseWindow,
  summaryByMonth,
} from "@/lib/forecast";
import {
  CATEGORIES_BY_KIND,
  CATEGORY_LABEL,
} from "@/lib/categories";
import { currentMonth, formatMonthLabel, formatMonthShort } from "@/lib/format";
import { monthInputToDate } from "@/lib/format";
import type {
  MonthlyLedgerRow,
  MonthlySummaryRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
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

  const [summaryRes, ledgerRes] = await Promise.all([
    supabase
      .from("monthly_summary")
      .select("*")
      .gte("month", startDate)
      .lte("month", endDate)
      .order("month", { ascending: true }),
    supabase
      .from("monthly_ledger")
      .select("*")
      .gte("month", startDate)
      .lte("month", endDate),
  ]);

  const loadError = summaryRes.error ?? ledgerRes.error;

  const summaryRows = (summaryRes.data ?? []) as MonthlySummaryRow[];
  const ledgerRows = (ledgerRes.data ?? []) as MonthlyLedgerRow[];

  const summary = summaryByMonth(summaryRows, monthList);
  const byCategory = ledgerByCategory(ledgerRows, monthList);

  const monthLabels = monthList.map(formatMonthShort);
  const currentMonthIndex = monthList.indexOf(start);

  // KPI: current-month totals.
  const cur = summary.get(start) ?? { income: 0, expenses: 0, net_profit: 0 };

  // Chart points.
  const chartData: ChartPoint[] = monthList.map((m, i) => {
    const t = summary.get(m)!;
    return {
      label: monthLabels[i],
      income: t.income,
      expenses: t.expenses,
      net_profit: t.net_profit,
    };
  });

  // P&L rows: income categories -> Total Income -> expense categories ->
  // Total Expenses -> Net Profit (bold).
  const rows: PnlRow[] = [];

  for (const category of CATEGORIES_BY_KIND.income) {
    const byMonth = byCategory.get(category)!;
    if (!categoryHasActivity(byMonth)) continue;
    rows.push({
      label: CATEGORY_LABEL[category],
      values: monthList.map((m) => byMonth.get(m) ?? 0),
      variant: "category",
    });
  }
  rows.push({
    label: "Total Income",
    values: monthList.map((m) => summary.get(m)!.income),
    variant: "subtotal",
  });

  for (const category of CATEGORIES_BY_KIND.expense) {
    const byMonth = byCategory.get(category)!;
    if (!categoryHasActivity(byMonth)) continue;
    rows.push({
      label: CATEGORY_LABEL[category],
      values: monthList.map((m) => byMonth.get(m) ?? 0),
      variant: "category",
    });
  }
  rows.push({
    label: "Total Expenses",
    values: monthList.map((m) => summary.get(m)!.expenses),
    variant: "subtotal",
  });

  rows.push({
    label: "Net Profit",
    values: monthList.map((m) => summary.get(m)!.net_profit),
    variant: "net",
  });

  const hasData = ledgerRows.length > 0;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Profit forecast for the next {months} months.
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
            Couldn&apos;t load the forecast: {loadError.message}
          </p>
        ) : (
          <>
            <KpiStrip
              monthLabel={formatMonthLabel(start)}
              income={cur.income}
              expenses={cur.expenses}
              netProfit={cur.net_profit}
            />

            {!hasData && (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                No forecast data yet.{" "}
                <a
                  href="/line-items"
                  className="font-semibold text-brand-600 hover:text-brand-700"
                >
                  Add some line items
                </a>{" "}
                to see your projection.
              </p>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-slate-700">
                Income, expenses &amp; net profit
              </h2>
              <div className="mt-3">
                <ForecastChart data={chartData} />
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-700">
                Month-by-month P&amp;L
              </h2>
              <PnlTable
                monthLabels={monthLabels}
                currentMonthIndex={currentMonthIndex}
                rows={rows}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
