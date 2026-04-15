const FALLBACK_CHAR_WIDTH = 14;
const METRIC_COLUMN_CHROME_WIDTH = 60;
const MIN_METRIC_COLUMN_WIDTH = 120;

let measureSpan: HTMLSpanElement | null = null;

const getFallbackWidth = (labels: string[]) =>
  Math.max(...labels.map((label) => label.length), 0) * FALLBACK_CHAR_WIDTH;

const getTextWidth = (labels: string[]) => {
  if (typeof document === "undefined") return getFallbackWidth(labels);

  if (!measureSpan) {
    measureSpan = document.createElement("span");
    measureSpan.style.cssText =
      "position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none;font-weight:500;font-size:11px;";
    document.body.appendChild(measureSpan);
  }

  const bodyFont = getComputedStyle(document.body).fontFamily || "monospace";
  measureSpan.style.fontFamily = bodyFont;

  let maxWidth = 0;
  for (const label of labels) {
    measureSpan.textContent = label;
    const w = measureSpan.getBoundingClientRect().width;
    if (w > maxWidth) maxWidth = w;
  }
  return maxWidth;
};

export const getMetricLabelColumnMinWidth = (metricNames: string[]) => {
  const labels = [...metricNames, "지표"].map((label) => label.trim()).filter(Boolean);
  if (labels.length === 0) return MIN_METRIC_COLUMN_WIDTH;

  return Math.max(
    MIN_METRIC_COLUMN_WIDTH,
    Math.ceil(getTextWidth(labels) + METRIC_COLUMN_CHROME_WIDTH)
  );
};

const getPixelValue = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const measureMetricLabelColumnMinWidth = (
  cells: HTMLElement[],
  metricNames: string[]
) => {
  let maxWidth = getMetricLabelColumnMinWidth(metricNames);

  for (const cell of cells) {
    const nameTitle = cell.querySelector(".name-title");
    if (!(nameTitle instanceof HTMLElement)) continue;

    const style = getComputedStyle(cell);
    const visibleChildren = Array.from(cell.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && getComputedStyle(child).display !== "none"
    );
    const gap = getPixelValue(style.columnGap || style.gap);
    const padding =
      getPixelValue(style.paddingLeft) +
      getPixelValue(style.paddingRight);
    const controlsWidth = visibleChildren.reduce((sum, child) => {
      if (child === nameTitle) return sum;
      return sum + child.getBoundingClientRect().width;
    }, 0);
    const width =
      padding +
      nameTitle.getBoundingClientRect().width +
      controlsWidth +
      gap * Math.max(0, visibleChildren.length - 1);

    maxWidth = Math.max(maxWidth, Math.ceil(width));
  }

  return maxWidth;
};
