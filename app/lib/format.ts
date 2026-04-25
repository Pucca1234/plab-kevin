import { Metric } from "../types";

export const formatNumber = (value: number) => value.toLocaleString("ko-KR");

export const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const formatValue = (value: number, metric: Metric) => {
  if (metric.format === "percent") return formatPercent(value);
  return formatNumber(value);
};

export const formatDelta = (
  metric: Pick<Metric, "format">,
  currentValue: number | null | undefined,
  previousValue: number | null | undefined
) => {
  if (currentValue === null || currentValue === undefined || previousValue === null || previousValue === undefined) {
    return "-";
  }

  const delta = currentValue - previousValue;
  if (metric.format === "percent") {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${(delta * 100).toFixed(1)}%p`;
  }

  if (previousValue === 0) {
    if (currentValue === 0) return "0.0%";
    return "-";
  }

  const changeRate = delta / Math.abs(previousValue);
  const sign = changeRate >= 0 ? "+" : "";
  return `${sign}${(changeRate * 100).toFixed(1)}%`;
};
