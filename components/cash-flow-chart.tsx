"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatMoney } from "@/lib/format";

export interface CashFlowChartItem {
  label: string;
  income: number;
  expenses: number;
}

export interface CashFlowChartProps {
  data: CashFlowChartItem[];
  currency: string;
}

export function CashFlowChart({ data, currency }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
          ]}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: "0.75rem",
            fontSize: "0.8125rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
        <Bar
          dataKey="income"
          name="Income"
          fill="var(--money-income)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="expenses"
          name="Expenses"
          fill="var(--money-expense)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

