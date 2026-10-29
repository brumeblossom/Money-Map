"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import { formatMoney } from "@/lib/format";

export interface CategoryDonutItem {
  id: string;
  name: string;
  amount_minor: number;
  color: string;
}

export interface CategoryDonutChartProps {
  items: CategoryDonutItem[];
  currency: string;
  onCategoryClick?: (categoryId: string) => void;
}

export function CategoryDonutChart({
  items,
  currency,
  onCategoryClick,
}: CategoryDonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={items}
          dataKey="amount_minor"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          isAnimationActive={false}
          onClick={(_, index) => {
            const item = items[index];
            if (item && onCategoryClick) {
              onCategoryClick(item.id);
            }
          }}
          cursor="pointer"
        >
          {items.map((item) => (
            <Cell key={item.id} fill={item.color} stroke="transparent" />
          ))}
        </Pie>
        <RechartsTooltip
          formatter={(val: unknown) => [
            formatMoney(Number(val), currency),
            "Amount",
          ]}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: "0.75rem",
            fontSize: "0.8125rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

