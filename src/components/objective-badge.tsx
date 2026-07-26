import type { BusinessObjective } from "@/modules/intelligence";

const OBJECTIVE_STYLES: Record<BusinessObjective, { label: string; className: string }> = {
  REVENUE: { label: "Revenue", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100" },
  RETENTION: { label: "Retention", className: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100" },
  GROWTH: { label: "Growth", className: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100" },
  ENGAGEMENT: { label: "Engagement", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  BRAND: { label: "Brand", className: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100" },
  SUPPORT: { label: "Support", className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100" },
};

export function ObjectiveBadge({ objective }: { objective: BusinessObjective }) {
  const style = OBJECTIVE_STYLES[objective];
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}
