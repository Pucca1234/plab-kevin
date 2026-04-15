"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ChartConfig } from "../../types";

const COLORS = ["#4E79A7", "#E49444", "#D1615D", "#85B6B2"];

export default function ChatChart({ config }: { config: ChartConfig }) {
  const data = config.labels.map((label, i) => {
    const point: Record<string, string | number | null> = { name: label };
    for (const ds of config.datasets) {
      point[ds.name] = ds.values[i] ?? null;
    }
    return point;
  });

  const yLabel = config.yAxis
    ? { value: config.yAxis, angle: -90, position: "insideLeft" as const, style: { fontSize: 11, fill: "#767676" } }
    : undefined;

  const commonProps = {
    data,
    margin: { top: 8, right: 12, bottom: 4, left: 8 },
  };

  return (
    <div className="chat-chart">
      {config.title && <div className="chat-chart-title">{config.title}</div>}
      <ResponsiveContainer width="100%" height={180}>
        {config.type === "bar" ? (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D4D4D4" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#767676" />
            <YAxis tick={{ fontSize: 10 }} stroke="#767676" label={yLabel} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #D4D4D4" }}
            />
            {config.datasets.map((ds, i) => (
              <Bar
                key={ds.name}
                dataKey={ds.name}
                fill={COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D4D4D4" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#767676" />
            <YAxis tick={{ fontSize: 10 }} stroke="#767676" label={yLabel} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #D4D4D4" }}
            />
            {config.datasets.map((ds, i) => (
              <Line
                key={ds.name}
                type="monotone"
                dataKey={ds.name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
