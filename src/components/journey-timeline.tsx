import type { JourneyRecord, JourneyStepType } from "@/modules/intelligence";

const STEP_LABEL: Record<JourneyStepType, string> = {
  POST_VIEW: "Post view",
  PROFILE_VISIT: "Profile visit",
  DM: "DM",
  COUPON_SENT: "Coupon sent",
  ORDER: "Order",
};

const OUTCOME_STYLE: Record<string, string> = {
  PURCHASE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  FOLLOW: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100",
  INQUIRY: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  CHURNED: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100",
  OPEN: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
};

export function JourneyTimeline({ journey }: { journey: JourneyRecord }) {
  return (
    <li className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {journey.customerId ?? journey.externalUserId ?? "Anonymous visitor"}
          </p>
          <p className="text-xs text-muted-foreground">
            {journey.channel ?? "unknown channel"}
            {journey.attributedRevenue != null && ` · $${journey.attributedRevenue.toFixed(2)} attributed`}
          </p>
        </div>
        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLE[journey.outcome] ?? OUTCOME_STYLE.OPEN}`}>
          {journey.outcome}
        </span>
      </div>
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {journey.steps.map((step, i) => (
          <li key={step.id} className="flex items-center gap-1">
            <span className="rounded bg-muted px-2 py-1 font-medium">{STEP_LABEL[step.type]}</span>
            {i < journey.steps.length - 1 && <span className="text-muted-foreground">→</span>}
          </li>
        ))}
      </ol>
    </li>
  );
}
