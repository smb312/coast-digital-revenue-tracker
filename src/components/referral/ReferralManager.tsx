"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LineItem } from "@/lib/database.types";
import {
  amountColorClass,
  currentMonth,
  formatCurrency,
  formatMonthLabel,
} from "@/lib/format";
import { computeStatus, type ItemStatus } from "@/lib/line-items";
import LineItemForm from "@/components/line-items/LineItemForm";
import {
  createLineItem,
  deleteLineItem,
  stopLineItem,
  updateLineItem,
} from "@/app/line-items/actions";

function StatusBadge({ status }: { status: ItemStatus }) {
  const styles: Record<ItemStatus["kind"], string> = {
    active: "bg-green-50 text-green-700",
    ends: "bg-amber-50 text-amber-700",
    ended: "bg-slate-100 text-slate-500",
    scheduled: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${styles[status.kind]}`}
    >
      {status.label}
    </span>
  );
}

type FormState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; item: LineItem };

// Editable list of referral-income sources. Reuses the shared LineItemForm
// locked to the referral_revenue category and the shared line-item actions.
export default function ReferralManager({ items }: { items: LineItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ mode: "closed" });
  const [stopFor, setStopFor] = useState<LineItem | null>(null);
  const [stopMonth, setStopMonth] = useState(currentMonth());
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleDelete(item: LineItem) {
    if (!confirm(`Delete referral source "${item.name}"?`)) return;
    const res = await deleteLineItem(item.id);
    if (!res.ok) alert(res.error);
    else refresh();
  }

  async function handleStop() {
    if (!stopFor) return;
    const res = await stopLineItem(stopFor.id, stopMonth);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setStopFor(null);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          Referral sources
        </h2>
        <button
          onClick={() => setForm({ mode: "add" })}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          + Add referral
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">No referral sources yet.</p>
          <button
            onClick={() => setForm({ mode: "add" })}
            className="mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Add your first referral →
          </button>
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Counterparty</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Freq.</th>
                <th className="px-4 py-2 font-medium">Start</th>
                <th className="px-4 py-2 font-medium">End</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const status = computeStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {item.counterparty ?? "—"}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${amountColorClass(item.amount)}`}
                    >
                      {formatCurrency(item.amount, true)}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {item.frequency === "monthly" ? "Monthly" : "One-time"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {formatMonthLabel(item.start_month)}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {item.end_month ? formatMonthLabel(item.end_month) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2 whitespace-nowrap text-xs">
                        <button
                          onClick={() => setForm({ mode: "edit", item })}
                          className="font-medium text-brand-600 hover:text-brand-700"
                        >
                          Edit
                        </button>
                        {item.frequency === "monthly" &&
                          status.kind !== "ended" && (
                            <button
                              onClick={() => {
                                setStopFor(item);
                                setStopMonth(
                                  item.end_month?.slice(0, 7) ?? currentMonth()
                                );
                              }}
                              className="font-medium text-amber-600 hover:text-amber-700"
                            >
                              Stop
                            </button>
                          )}
                        <button
                          onClick={() => handleDelete(item)}
                          className="font-medium text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form.mode !== "closed" && (
        <LineItemForm
          initial={form.mode === "edit" ? form.item : null}
          restrictToCategory="referral_revenue"
          onClose={() => setForm({ mode: "closed" })}
          onSubmit={async (formData) => {
            const res =
              form.mode === "edit"
                ? await updateLineItem(form.item.id, formData)
                : await createLineItem(formData);
            if (res.ok) refresh();
            return res;
          }}
        />
      )}

      {stopFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Stop “{stopFor.name}”</h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose the last active month. It runs through this month and stops
              the month after.
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Last active month
              <input
                type="month"
                value={stopMonth}
                onChange={(e) => setStopMonth(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setStopFor(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStop}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Stop item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
