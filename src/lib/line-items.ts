import type { LineItem } from "@/lib/database.types";
import { compareMonths, currentMonth, formatMonthLabel } from "@/lib/format";

export type ItemStatus =
  | { kind: "active"; label: "Active" }
  | { kind: "ends"; label: string } // "Ends Jun 2026"
  | { kind: "ended"; label: "Ended" }
  | { kind: "scheduled"; label: string }; // "Starts Aug 2026"

// Derive a line item's status relative to the current month.
//   - end_month stops the item the month AFTER it (so end_month is the last
//     active month).
//   - a one_time item only hits its start_month.
export function computeStatus(
  item: Pick<LineItem, "frequency" | "start_month" | "end_month">,
  now: string = currentMonth()
): ItemStatus {
  const start = item.start_month;

  if (item.frequency === "one_time") {
    const cmp = compareMonths(start, now);
    if (cmp > 0) return { kind: "scheduled", label: `Starts ${formatMonthLabel(start)}` };
    if (cmp < 0) return { kind: "ended", label: "Ended" };
    return { kind: "active", label: "Active" };
  }

  // monthly
  if (compareMonths(start, now) > 0) {
    return { kind: "scheduled", label: `Starts ${formatMonthLabel(start)}` };
  }

  if (!item.end_month) {
    return { kind: "active", label: "Active" };
  }

  const endCmp = compareMonths(item.end_month, now);
  if (endCmp < 0) return { kind: "ended", label: "Ended" };
  // end_month is this month or later: still active, but flag the wind-down.
  return { kind: "ends", label: `Ends ${formatMonthLabel(item.end_month)}` };
}
