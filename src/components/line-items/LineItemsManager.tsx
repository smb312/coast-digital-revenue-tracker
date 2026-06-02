"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LineItem, MonthlyOverride } from "@/lib/database.types";
import {
  CATEGORIES_BY_KIND,
  CATEGORY_LABEL,
  KIND_LABEL,
  KIND_ORDER,
} from "@/lib/categories";
import {
  amountColorClass,
  currentMonth,
  formatCurrency,
  formatMonthLabel,
} from "@/lib/format";
import { computeStatus, type ItemStatus } from "@/lib/line-items";
import LineItemForm from "./LineItemForm";
import OverridesModal from "@/components/overrides/OverridesModal";
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

export default function LineItemsManager({
  items,
  overrides,
}: {
  items: LineItem[];
  overrides: MonthlyOverride[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ mode: "closed" });
  const [stopFor, setStopFor] = useState<LineItem | null>(null);
  const [stopMonth, setStopMonth] = useState(currentMonth());
  const [overridesFor, setOverridesFor] = useState<LineItem | null>(null);
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  const overridesByItem = new Map<string, MonthlyOverride[]>();
  for (const o of overrides) {
    const list = overridesByItem.get(o.line_item_id) ?? [];
    list.push(o);
    overridesByItem.set(o.line_item_id, list);
  }

  async function handleDelete(item: LineItem) {
    if (
      !confirm(
        `Delete "${item.name}"? This removes it from the forecast entirely. To keep history, stop it instead.`
      )
    )
      return;
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

  const byCategory = new Map<string, LineItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Line Items</h1>
          <p className="mt-1 text-sm text-slate-600">
            Income and expenses that drive the forecast.
          </p>
        </div>
        <button
          onClick={() => setForm({ mode: "add" })}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          + Add line item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">No line items yet.</p>
          <button
            onClick={() => setForm({ mode: "add" })}
            className="mt-3 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Add your first one →
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {KIND_ORDER.map((kind) => {
            const categoriesWithItems = CATEGORIES_BY_KIND[kind].filter(
              (c) => (byCategory.get(c) ?? []).length > 0
            );
            if (categoriesWithItems.length === 0) return null;

            return (
              <section key={kind}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {KIND_LABEL[kind]}
                </h2>
                <div className="mt-2 space-y-5">
                  {categoriesWithItems.map((category) => {
                    const rows = byCategory.get(category) ?? [];
                    return (
                      <div
                        key={category}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                          {CATEGORY_LABEL[category]}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                                <th className="px-4 py-2 font-medium">Name</th>
                                <th className="px-4 py-2 font-medium">
                                  Counterparty
                                </th>
                                <th className="px-4 py-2 text-right font-medium">
                                  Amount
                                </th>
                                <th className="px-4 py-2 font-medium">Freq.</th>
                                <th className="px-4 py-2 font-medium">Start</th>
                                <th className="px-4 py-2 font-medium">End</th>
                                <th className="px-4 py-2 font-medium">Status</th>
                                <th className="px-4 py-2 text-right font-medium">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {rows.map((item) => {
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
                                      {item.frequency === "monthly"
                                        ? "Monthly"
                                        : "One-time"}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600">
                                      {formatMonthLabel(item.start_month)}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600">
                                      {item.end_month
                                        ? formatMonthLabel(item.end_month)
                                        : "—"}
                                    </td>
                                    <td className="px-4 py-2">
                                      <StatusBadge status={status} />
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex justify-end gap-2 whitespace-nowrap text-xs">
                                        <button
                                          onClick={() =>
                                            setForm({ mode: "edit", item })
                                          }
                                          className="font-medium text-brand-600 hover:text-brand-700"
                                        >
                                          Edit
                                        </button>
                                        {item.frequency === "monthly" &&
                                          status.kind !== "ended" && (
                                            <button
                                              onClick={() =>
                                                setOverridesFor(item)
                                              }
                                              className="font-medium text-slate-600 hover:text-slate-900"
                                            >
                                              Months
                                              {(overridesByItem.get(item.id)
                                                ?.length ?? 0) > 0
                                                ? ` (${overridesByItem.get(item.id)!.length})`
                                                : ""}
                                            </button>
                                          )}
                                        {item.frequency === "monthly" &&
                                          status.kind !== "ended" && (
                                            <button
                                              onClick={() => {
                                                setStopFor(item);
                                                setStopMonth(
                                                  item.end_month?.slice(0, 7) ??
                                                    currentMonth()
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
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {form.mode !== "closed" && (
        <LineItemForm
          initial={form.mode === "edit" ? form.item : null}
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

      {overridesFor && (
        <OverridesModal
          item={overridesFor}
          overrides={overridesByItem.get(overridesFor.id) ?? []}
          onClose={() => setOverridesFor(null)}
          onChanged={refresh}
        />
      )}

      {stopFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Stop “{stopFor.name}”</h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose the last active month. The item runs through this month and
              stops the month after.
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
