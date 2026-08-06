"use client";

import { useActionState, useState, type FormEvent } from "react";
import type { ContentActionState } from "@/modules/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const MEDIA_TYPES = [
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Video" },
  { value: "REEL", label: "Reel" },
  { value: "CAROUSEL", label: "Carousel" },
  { value: "STORY", label: "Story" },
];

type Action = (
  prev: ContentActionState,
  formData: FormData,
) => Promise<ContentActionState>;

interface PublishPostFormProps {
  action: Action;
  projectId: string;
  mode?: "publish" | "schedule";
  submitLabel?: string;
}

export function PublishPostForm({
  action,
  projectId,
  mode = "publish",
  submitLabel,
}: PublishPostFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [mediaType, setMediaType] = useState("IMAGE");
  const [urls, setUrls] = useState<string[]>([""]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (isSchedule) {
      const localValue = formData.get("scheduledAtLocal");
      if (localValue) {
        formData.set("scheduledAt", new Date(localValue as string).toISOString());
      }
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        formData.set("scheduledAtTimezone", timeZone);
      } catch {
        // fall back to UTC string hidden by default
      }
    }
    formAction(formData);
  }

  const isCarousel = mediaType === "CAROUSEL";
  const isSchedule = mode === "schedule";
  const buttonLabel =
    submitLabel ?? (isSchedule ? "Schedule" : "Publish now");

  function updateUrl(index: number, value: string) {
    setUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addUrl() {
    setUrls((prev) => [...prev, ""]);
  }

  function removeUrl(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="mediaType" value={mediaType} />

      <div className="space-y-1.5">
        <Label htmlFor="mediaType">Media type</Label>
        <select
          id="mediaType"
          name="mediaType"
          value={mediaType}
          onChange={(e) => {
            setMediaType(e.target.value);
            setUrls([""]);
          }}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {MEDIA_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="caption">Caption</Label>
        <Textarea
          id="caption"
          name="caption"
          rows={3}
          maxLength={2200}
          placeholder="Write a caption…"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label>Media URLs</Label>
        {urls.map((url, index) => (
          <div key={index} className="flex gap-2">
            <Input
              name="mediaUrls"
              type="url"
              required
              value={url}
              onChange={(e) => updateUrl(index, e.target.value)}
              placeholder="https://example.com/media.jpg"
              disabled={pending}
            />
            {urls.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeUrl(index)}
                disabled={pending}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        {isCarousel && (
          <Button type="button" variant="outline" size="sm" onClick={addUrl} disabled={pending}>
            Add slide
          </Button>
        )}
      </div>

      {isSchedule && (
        <div className="space-y-1.5">
          <Label htmlFor="scheduledAtLocal">Schedule date and time</Label>
          <Input
            id="scheduledAtLocal"
            name="scheduledAtLocal"
            type="datetime-local"
            required
            disabled={pending}
          />
          <input type="hidden" name="scheduledAt" />
          <input type="hidden" name="scheduledAtTimezone" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (isSchedule ? "Scheduling…" : "Publishing…") : buttonLabel}
        </Button>
        {state?.ok && (
          <p className="text-sm text-green-600">{state.message}</p>
        )}
        {state?.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
