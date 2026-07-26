export function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, confidence)) * 100);
  const barClass = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="flex items-center gap-2" aria-label={`Confidence ${pct}%`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}
