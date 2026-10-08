"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { useFormat } from "@/shared/hook/useFormat";
import type { MetricPoint } from "../api/dashboard.api";

interface SalesChartProps {
  data: MetricPoint[];
  title: string;
}

export default function SalesChart({ data, title }: SalesChartProps) {
  const t = useTranslations("admin.chart");
  const format = useFormat();
  const points = data.map((point) => ({ ...point, revenue: point.revenueCents / 100 }));

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-medium text-slate-700">{title}</figcaption>
      {points.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <div className="h-64 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="revenue" tick={{ fontSize: 12 }} width={70} />
              <YAxis
                yAxisId="orders"
                orientation="right"
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                width={40}
              />
              <Tooltip
                formatter={(value, name) =>
                  name === t("revenue") ? format.money(Number(value) * 100) : value
                }
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name={t("revenue")}
                stroke="#0f172a"
                fill="#cbd5e1"
                isAnimationActive={false}
              />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                name={t("orders")}
                stroke="#2563eb"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{t("period")}</th>
            <th scope="col">{t("revenue")}</th>
            <th scope="col">{t("orders")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.period}>
              <td>{point.period}</td>
              <td>{format.money(point.revenueCents)}</td>
              <td>{point.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
