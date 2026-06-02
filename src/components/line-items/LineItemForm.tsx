"use client";

import { useState } from "react";
import type { ItemKind, LineItem } from "@/lib/database.types";
import {
  CATEGORIES_BY_KIND,
  CATEGORY_LABEL,
  KIND_LABEL,
  KIND_ORDER,
} from "@/lib/categories";
import { dateToMonthInput } from "@/lib/format";
import type { ActionResult } from "@/app/line-items/actions";

type Props = {
  initial?: LineItem | null;
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onClose: () => void;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";
const labelClass = "block text-sm font-medium text-slate-700";

export default function LineItemForm({ initial, onSubmit, onClose }: Props) {
  const [kind, setKind] = useState<ItemKind>(initial?.kind ?? "income");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "monthly");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const categories = CATEGORIES_BY_KIND[kind];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await onSubmit(formData);
    setPending(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initial ? "Edit line item" : "Add line item"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              className={inputClass}
              placeholder="e.g. Acme Corp retainer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="kind" className={labelClass}>
                Type
              </label>
              <select
                id="kind"
                name="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as ItemKind)}
                className={inputClass}
              >
                {KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category" className={labelClass}>
                Category
              </label>
              <select
                id="category"
                name="category"
                defaultValue={initial?.category}
                key={kind} // reset selection when kind changes
                className={inputClass}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className={labelClass}>
                Amount (USD)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={initial?.amount ?? ""}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="frequency" className={labelClass}>
                Frequency
              </label>
              <select
                id="frequency"
                name="frequency"
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as "monthly" | "one_time")
                }
                className={inputClass}
              >
                <option value="monthly">Monthly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_month" className={labelClass}>
                Start month
              </label>
              <input
                id="start_month"
                name="start_month"
                type="month"
                required
                defaultValue={dateToMonthInput(initial?.start_month)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="end_month" className={labelClass}>
                End month{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="end_month"
                name="end_month"
                type="month"
                disabled={frequency === "one_time"}
                defaultValue={dateToMonthInput(initial?.end_month)}
                className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="counterparty" className={labelClass}>
              Counterparty{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="counterparty"
              name="counterparty"
              defaultValue={initial?.counterparty ?? ""}
              className={inputClass}
              placeholder="Client, vendor, employee…"
            />
          </div>

          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={initial?.notes ?? ""}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {frequency === "monthly" && (
            <p className="text-xs text-slate-400">
              Editing the amount applies going forward. Set an end month to stop
              the item — it runs through that month and stops the month after.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : initial ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
