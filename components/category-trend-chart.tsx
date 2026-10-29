"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import { formatMoney } from "@/lib/format";

export interface TrendChartItem {
  month: string;
  label: string;
  amount_minor: number;
  amount_major: number;
}

export interface CategoryTrendChartProps {
  data: TrendChartItem[];
  currency: string;
}

export function CategoryTrendChart({ data, currency }: CategoryTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(val) => {
            if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
            if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
            return `${val}`;
          }}
        />
        <RechartsTooltip
          formatter={(val: unknown) => [
            formatMoney(Math.round(Number(val) * 100), currency),
            "Spent",
          ]}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: "0.75rem",
            fontSize: "0.8125rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        />
        <Line
          type="monotone"
          dataKey="amount_major"
          stroke="var(--primary)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--primary)" }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
