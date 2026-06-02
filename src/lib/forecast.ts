import type {
  ItemCategory,
  MonthlyLedgerRow,
  MonthlySummaryRow,
} from "@/lib/database.types";
import { addMonths, dateToMonthInput } from "@/lib/format";
import { ALL_CATEGORIES } from "@/lib/categories";

// Allowed forecast windows (months forward, including the current month).
export const WINDOW_OPTIONS = [6, 12, 24] as const;
export type WindowMonths = (typeof WINDOW_OPTIONS)[number];

export function parseWindow(raw: string | undefined): WindowMonths {
  const n = Number(raw);
  return (WINDOW_OPTIONS as readonly number[]).includes(n)
    ? (n as WindowMonths)
    : 12;
}

// The list of yyyy-mm months in the window, starting at `startYM`.
export function buildMonths(startYM: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(startYM, i));
}

export type MonthTotals = {
  income: number;
  expenses: number;
  net_profit: number;
};

// Index summary rows by yyyy-mm, filling missing months with zeros.
export function summaryByMonth(
  rows: MonthlySummaryRow[],
  months: string[]
): Map<string, MonthTotals> {
  const map = new Map<string, MonthTotals>();
  for (const m of months) {
    map.set(m, { income: 0, expenses: 0, net_profit: 0 });
  }
  for (const r of rows) {
    const ym = dateToMonthInput(r.month);
    if (map.has(ym)) {
      map.set(ym, {
        income: Number(r.income) || 0,
        expenses: Number(r.expenses) || 0,
        net_profit: Number(r.net_profit) || 0,
      });
    }
  }
  return map;
}

// Aggregate ledger rows into category -> (yyyy-mm -> summed amount).
export function ledgerByCategory(
  rows: MonthlyLedgerRow[],
  months: string[]
): Map<ItemCategory, Map<string, number>> {
  const monthsSet = new Set(months);
  const map = new Map<ItemCategory, Map<string, number>>();
  for (const c of ALL_CATEGORIES) {
    map.set(c, new Map(months.map((m) => [m, 0])));
  }
  for (const r of rows) {
    const ym = dateToMonthInput(r.month);
    if (!monthsSet.has(ym)) continue;
    const byMonth = map.get(r.category);
    if (!byMonth) continue;
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + (Number(r.amount) || 0));
  }
  return map;
}

// Does a category have any non-zero amount across the window?
export function categoryHasActivity(byMonth: Map<string, number>): boolean {
  for (const v of byMonth.values()) {
    if (v !== 0) return true;
  }
  return false;
}
