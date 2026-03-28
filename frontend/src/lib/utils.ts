export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDateTime(value?: string | number | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}

export function formatMs(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  if (value >= 100) {
    return `${value.toFixed(0)}ms`;
  }
  if (value >= 10) {
    return `${value.toFixed(1)}ms`;
  }
  return `${value.toFixed(2)}ms`;
}
