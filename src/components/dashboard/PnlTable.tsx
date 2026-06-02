import { amountColorClass, formatCurrency } from "@/lib/format";

export type PnlRow = {
  label: string;
  values: number[]; // one per month, aligned with monthLabels
  variant: "category" | "subtotal" | "net";
};

type Props = {
  monthLabels: string[];
  currentMonthIndex: number; // column to highlight, or -1
  rows: PnlRow[];
};

function cellClass(value: number, variant: PnlRow["variant"]) {
  const weight = variant === "category" ? "" : "font-semibold";
  return `${weight} ${amountColorClass(value)}`;
}

// Month-by-month P&L. Rows grouped by category with subtotals and a bold
// Net Profit row. Columns are the forecast months. Negatives render in
// parentheses + red via formatCurrency / amountColorClass.
export default function PnlTable({
  monthLabels,
  currentMonthIndex,
  rows,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="sticky left-0 z-10 bg-white px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category
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
          {rows.map((row, ri) => {
            const isNet = row.variant === "net";
            const isSubtotal = row.variant === "subtotal";
            const rowBg = isNet
              ? "bg-slate-50"
              : isSubtotal
                ? "bg-slate-50/50"
                : "";
            const labelClass = isNet
              ? "font-bold text-slate-900"
              : isSubtotal
                ? "font-semibold text-slate-700"
                : "text-slate-600";
            return (
              <tr
                key={ri}
                className={`border-b border-slate-100 ${rowBg} ${
                  isNet ? "border-t-2 border-t-slate-300" : ""
                }`}
              >
                <td
                  className={`sticky left-0 z-10 whitespace-nowrap px-4 py-2 ${rowBg || "bg-white"} ${labelClass} ${row.variant === "category" ? "pl-6" : ""}`}
                >
                  {row.label}
                </td>
                {row.values.map((v, ci) => (
                  <td
                    key={ci}
                    className={`whitespace-nowrap px-4 py-2 text-right tabular-nums ${cellClass(v, row.variant)} ${
                      ci === currentMonthIndex ? "bg-brand-50/60" : ""
                    }`}
                  >
                    {formatCurrency(v)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
