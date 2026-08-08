'use client';

import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({ title, description }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-surface-elevation/30 py-12 px-6 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card-base space-y-4">
      <div className="h-6 w-32 rounded-md bg-surface-elevation/50" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded-md bg-surface-elevation/50" />
        <div className="h-4 w-5/6 rounded-md bg-surface-elevation/50" />
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card-base h-12 bg-surface-elevation/50" />
      ))}
    </div>
  );
}
