"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { formatDate } from "@/lib/format";
import type { WeeklyMetric } from "@/lib/admin/types";

export function AdminSignupsChart({ data }: { data: WeeklyMetric[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
        <XAxis
          dataKey="week_start"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          tickMargin={6}
          tickFormatter={(val) => formatDate(val).slice(0, 5)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={10}
          allowDecimals={false}
        />
        <RechartsTooltip
          formatter={(val: unknown) => [Number(val).toLocaleString(), "Sign-ups"]}
          labelFormatter={(label) => `Week of ${formatDate(String(label))}`}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: "0.75rem",
            fontSize: "0.8125rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        />
        <Bar
          dataKey="count"
          fill="var(--primary)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AdminActiveUsersChart({ data }: { data: WeeklyMetric[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
        <XAxis
          dataKey="week_start"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          tickMargin={6}
          tickFormatter={(val) => formatDate(val).slice(0, 5)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={10}
          allowDecimals={false}
        />
        <RechartsTooltip
          formatter={(val: unknown) => [Number(val).toLocaleString(), "Active users"]}
          labelFormatter={(label) => `Week of ${formatDate(String(label))}`}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: "0.75rem",
            fontSize: "0.8125rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        />
        <Bar
          dataKey="count"
          fill="var(--money-income)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

