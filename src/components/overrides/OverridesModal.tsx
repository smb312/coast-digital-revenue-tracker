"use client";

import { useMemo, useState } from "react";
import type { LineItem, MonthlyOverride } from "@/lib/database.types";
import {
  addMonths,
  compareMonths,
  currentMonth,
  dateToMonthInput,
  formatCurrency,
  formatMonthLabel,
} from "@/lib/format";
import { clearOverride, setOverride } from "@/app/line-items/actions";

type Props = {
  item: LineItem;
  overrides: MonthlyOverride[]; // existing overrides for this item
  onClose: () => void;
  onChanged: () => void;
};

const MAX_MONTHS = 12;

// Build the list of months we let the user override: from the later of this
// month / the item's start, for up to 12 months, not past its end month.
function overridableMonths(item: LineItem): string[] {
  const startYM = dateToMonthInput(item.start_month);
  const now = currentMonth();
  let first = compareMonths(startYM, now) > 0 ? startYM : now;

  if (item.frequency === "one_time") {
    // A one-time item only hits its start month.
    return compareMonths(startYM, now) >= 0 ? [startYM] : [startYM];
  }

  const endYM = item.end_month ? dateToMonthInput(item.end_month) : null;
  const months: string[] = [];
  for (let i = 0; i < MAX_MONTHS; i++) {
    const m = addMonths(first, i);
    if (endYM && compareMonths(m, endYM) > 0) break;
    months.push(m);
  }
  // keep `first` referenced for clarity
  void first;
  return months;
}

export default function OverridesModal({
  item,
  overrides,
  onClose,
  onChanged,
}: Props) {
  const months = useMemo(() => overridableMonths(item), [item]);

  const existing = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of overrides) map.set(dateToMonthInput(o.month), o.amount);
    return map;
  }, [overrides]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const m of months) {
      init[m] = existing.has(m) ? String(existing.get(m)) : "";
    }
    return init;
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);

    const ops: Promise<{ ok: boolean; error?: string }>[] = [];
    for (const m of months) {
      const raw = (values[m] ?? "").trim();
      const had = existing.has(m);
      if (raw === "") {
        if (had) ops.push(clearOverride(item.id, m));
      } else {
        const num = Number(raw);
        if (!Number.isFinite(num)) {
          setError(`"${raw}" isn't a valid amount.`);
          setPending(false);
          return;
        }
        if (!had || existing.get(m) !== num) {
          ops.push(setOverride(item.id, m, num));
        }
      }
    }

    if (ops.length === 0) {
      onClose();
      return;
    }

    const results = await Promise.all(ops);
    setPending(false);
    const failed = results.find((r) => !r.ok);
    if (failed) {
      setError(failed.error ?? "Something went wrong saving overrides.");
      return;
    }
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Monthly overrides</h2>
            <p className="text-sm text-slate-500">{item.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Default is{" "}
          <span className="font-medium text-slate-700">
            {formatCurrency(item.amount, true)}/mo
          </span>
          . Enter an amount to override a single month; leave blank to keep the
          default.
        </p>

        {months.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            This item isn&apos;t active in the upcoming months, so there&apos;s
            nothing to override.
          </p>
        ) : (
          <div className="mt-4 max-h-80 space-y-1 overflow-y-auto pr-1">
            {months.map((m) => {
              const isOverridden =
                (values[m] ?? "").trim() !== "" &&
                Number(values[m]) !== item.amount;
              return (
                <div
                  key={m}
                  className="flex items-center justify-between gap-3 rounded-lg px-1 py-1"
                >
                  <span className="w-24 text-sm text-slate-600">
                    {formatMonthLabel(m)}
                  </span>
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={values[m] ?? ""}
                      placeholder={String(item.amount)}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [m]: e.target.value }))
                      }
                      className={`w-full rounded-lg border px-3 py-1.5 pl-6 text-right text-sm tabular-nums shadow-sm outline-none focus:ring-2 focus:ring-brand-500/30 ${
                        isOverridden
                          ? "border-brand-400 bg-brand-50/40"
                          : "border-slate-300"
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, [m]: "" }))}
                    className="w-12 text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Clear
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || months.length === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save overrides"}
          </button>
        </div>
      </div>
    </div>
  );
}
