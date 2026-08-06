"use client";

import { useActionState, useState } from "react";
import { reschedulePostAction } from "@/modules/content";
import { Badge } from "@/components/ui/badge";

interface CalendarSlot {
  date: string; // YYYY-MM-DD
  hour: number;
  dayOfWeek: string;
  format: string;
  suggestedCaption: string;
  suggestedHashtags: string[];
  productNames: string[];
  reason: string;
}

interface ScheduledItem {
  id: string;
  mediaType: string;
  caption: string | null;
  status: string;
  scheduledAt: string;
  scheduledAtTimezone: string | null;
}

interface ContentCalendarProps {
  projectId: string;
  slots: CalendarSlot[];
  scheduled: ScheduledItem[];
}

const FORMAT_LABEL: Record<string, string> = {
  REEL: "Reel",
  CAROUSEL: "Carousel",
  POST: "Post",
  STORY: "Story",
};

function cellKey(date: string, hour: number): string {
  return `${date}-${hour}`;
}

function utcDateParts(iso: string): { date: string; hour: number } {
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, hour: d.getUTCHours() };
}

export function ContentCalendar({ projectId, slots, scheduled }: ContentCalendarProps) {
  const [state, formAction, pending] = useActionState(reschedulePostAction, {});
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const cells = new Map<string, CalendarSlot>();
  for (const slot of slots) {
    cells.set(cellKey(slot.date, slot.hour), slot);
  }

  const scheduledByCell = new Map<string, ScheduledItem[]>();
  for (const item of scheduled) {
    const { date, hour } = utcDateParts(item.scheduledAt);
    const key = cellKey(date, hour);
    const list = scheduledByCell.get(key) ?? [];
    list.push(item);
    scheduledByCell.set(key, list);
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(slot: CalendarSlot) {
    if (!draggedId) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
    const scheduledAt = new Date(`${slot.date}T${String(slot.hour).padStart(2, "0")}:00:00Z`).toISOString();

    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("scheduledPostId", draggedId);
    formData.set("scheduledAt", scheduledAt);
    formData.set("scheduledAtTimezone", timeZone);
    formAction(formData);
    setDraggedId(null);
  }

  return (
    <section className="mb-8 rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Content calendar</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Drag a scheduled post onto a suggested slot to reschedule it.
      </p>

      {state?.error && (
        <p className="mb-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="mb-2 text-sm text-green-600">{state.message}</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => {
          const key = cellKey(slot.date, slot.hour);
          const items = scheduledByCell.get(key) ?? [];
          return (
            <div
              key={key}
              className={`rounded-md border p-3 transition-colors ${pending ? "opacity-60" : "hover:bg-muted/40"}`}
              onDragOver={handleDragOver}
              onDrop={(e) => { e.preventDefault(); handleDrop(slot); }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {slot.dayOfWeek} {slot.date.slice(5)} · {String(slot.hour).padStart(2, "0")}:00
                </span>
                <Badge variant="outline">{FORMAT_LABEL[slot.format] ?? slot.format}</Badge>
              </div>
              <p className="mb-1 text-sm text-muted-foreground">{slot.suggestedCaption}</p>
              <p className="mb-2 text-xs text-muted-foreground">
                {slot.suggestedHashtags.slice(0, 3).join(" ")}
              </p>
              {items.length > 0 && (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      draggable={!pending}
                      onDragStart={() => handleDragStart(item.id)}
                      className="cursor-move rounded-md bg-primary/10 p-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{FORMAT_LABEL[item.mediaType] ?? item.mediaType}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.status}
                        </Badge>
                      </div>
                      {item.caption && <p className="mt-1 truncate text-xs text-muted-foreground">{item.caption}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
