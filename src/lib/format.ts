// Shared formatting + date helpers used across the dashboard and line items.

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyFmtCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Format a dollar amount. Negatives render in parentheses, e.g. ($1,200).
export function formatCurrency(value: number, withCents = false): string {
  const fmt = withCents ? currencyFmtCents : currencyFmt;
  const abs = fmt.format(Math.abs(value));
  return value < 0 ? `(${abs})` : abs;
}

// Tailwind text color for a signed value (negatives red, else slate).
export function amountColorClass(value: number): string {
  return value < 0 ? "text-red-600" : "text-slate-900";
}

// --- Month helpers ---------------------------------------------------------
// The DB stores months as a date on the 1st (yyyy-mm-dd). The UI works with
// month inputs (yyyy-mm). These convert between the two without timezone drift.

// "2026-06-01" -> "2026-06" (for <input type="month">). Accepts yyyy-mm too.
export function dateToMonthInput(date: string | null | undefined): string {
  if (!date) return "";
  return date.slice(0, 7);
}

// "2026-06" -> "2026-06-01" (for storing in a date column).
export function monthInputToDate(month: string): string {
  return `${month.slice(0, 7)}-01`;
}

// Current month as yyyy-mm, based on local "today".
export function currentMonth(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// "2026-06-01" or "2026-06" -> "Jun 2026". Empty/invalid -> "".
export function formatMonthLabel(date: string | null | undefined): string {
  const ym = dateToMonthInput(date);
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return "";
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Short label "Jun" / "Jun '27" used for compact table headers.
export function formatMonthShort(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// Add `n` months to a yyyy-mm string, returning yyyy-mm.
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}`;
}

// Compare two yyyy-mm (or yyyy-mm-dd) strings: -1, 0, 1.
export function compareMonths(a: string, b: string): number {
  const am = dateToMonthInput(a);
  const bm = dateToMonthInput(b);
  return am < bm ? -1 : am > bm ? 1 : 0;
}
