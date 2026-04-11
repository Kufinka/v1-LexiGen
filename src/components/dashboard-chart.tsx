"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyEntry {
  day: number;
  date: string;
  reviews: number;
  minutes: number;
}

interface DashboardChartProps {
  data: DailyEntry[];
  chartMode: "reviews" | "time";
}

export default function DashboardChart({ data, chartMode }: DashboardChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem",
            color: "hsl(var(--foreground))",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
          cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) =>
            chartMode === "reviews"
              ? [`${value} reviews`, "Reviews"]
              : [`${Math.round(value)} min`, "Time"]
          }
          labelFormatter={(label) => `Day ${label}`}
        />
        <Bar
          dataKey={chartMode === "reviews" ? "reviews" : "minutes"}
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
