"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

export type ChartPoint = {
  label: string; // "Jun 25"
  income: number;
  expenses: number;
  net_profit: number;
};

const yTickFmt = (v: number) => {
  const abs = Math.abs(v);
  const s =
    abs >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v));
  return `$${s}`;
};

export default function ForecastChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tickFormatter={yTickFmt}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name,
            ]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="income"
            name="Income"
            fill="#86efac"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="#fca5a5"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Line
            type="monotone"
            dataKey="net_profit"
            name="Net Profit"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
