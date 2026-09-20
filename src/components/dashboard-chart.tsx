"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function DashboardChart({ data }: { data: Array<{ month: string; count: number }> }) {
  return (
    <div className="h-72 w-full rounded-3xl border border-blue-100 bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
          <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(94,234,212,0.08)" }}
            contentStyle={{
              background: "rgba(255,255,255,0.98)",
              border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: 16,
              color: "#0f172a",
            }}
          />
          <Bar dataKey="count" radius={[12, 12, 4, 4]} fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}