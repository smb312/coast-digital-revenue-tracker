import { amountColorClass, formatCurrency } from "@/lib/format";

type Props = {
  monthLabel: string;
  income: number;
  expenses: number;
  netProfit: number;
};

function Card({
  title,
  value,
  colorClass,
  accent,
}: {
  title: string;
  value: number;
  colorClass: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </p>
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${colorClass}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

// Current-month KPI strip: Income, Expenses, Net Profit.
export default function KpiStrip({
  monthLabel,
  income,
  expenses,
  netProfit,
}: Props) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        Current month · {monthLabel}
      </p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card
          title="Income"
          value={income}
          colorClass="text-slate-900"
          accent="bg-green-400"
        />
        <Card
          title="Expenses"
          value={expenses}
          colorClass="text-slate-900"
          accent="bg-red-400"
        />
        <Card
          title="Net Profit"
          value={netProfit}
          colorClass={amountColorClass(netProfit)}
          accent="bg-brand-500"
        />
      </div>
    </div>
  );
}
