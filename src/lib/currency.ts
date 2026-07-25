export function formatCurrency(
  value: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const code = currency?.trim().toUpperCase() || "INR";
  const locale = code === "USD" ? "en-US" : "en-IN";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    }).format(value);
  } catch {
    return `₹${value.toFixed(2)}`;
  }
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  try {
    return new Intl.NumberFormat("en-IN").format(value);
  } catch {
    return String(value);
  }
}
