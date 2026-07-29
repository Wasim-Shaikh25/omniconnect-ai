"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { updateNotificationPreferenceAction } from "@/modules/notifications";
import type { NotificationPreferenceRecord } from "@/modules/notifications";

const NOTIFICATION_TYPES = [
  "NEW_MESSAGE",
  "NEW_FOLLOWER",
  "COUPON_GENERATED",
  "COUPON_USED",
  "ESCALATION",
  "CONVERSATION_TAKEN_OVER",
  "AI_RESUMED",
  "SYSTEM_ERROR",
  "INTELLIGENCE",
] as const;

const CHANNELS = ["IN_APP", "EMAIL"] as const;

function preferenceKey(channel: string, eventType: string) {
  return `${channel}:${eventType}`;
}

export function NotificationPreferencesForm({
  preferences,
}: {
  preferences: NotificationPreferenceRecord[];
}) {
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const p of preferences) {
      map[preferenceKey(p.channel, p.eventType)] = p.enabled;
    }
    return map;
  });
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({});

  async function toggle(channel: string, eventType: string, enabled: boolean) {
    const key = preferenceKey(channel, eventType);
    setEnabledMap((prev) => ({ ...prev, [key]: enabled }));
    const formData = new FormData();
    formData.set("channel", channel);
    formData.set("eventType", eventType);
    formData.set("enabled", String(enabled));
    const result = await updateNotificationPreferenceAction({}, formData);
    setState(result);
  }

  return (
    <div className="space-y-4">
      {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      {state.ok && !state.error && (
        <p className="text-sm text-green-600">Preferences saved.</p>
      )}
      <div className="space-y-6">
        {NOTIFICATION_TYPES.map((eventType) => (
          <div key={eventType} className="rounded-md border p-4">
            <p className="font-medium">{eventType.replace(/_/g, " ")}</p>
            <div className="mt-3 flex flex-wrap gap-6">
              {CHANNELS.map((channel) => {
                const key = preferenceKey(channel, eventType);
                const enabled = enabledMap[key] ?? (channel === "IN_APP");
                return (
                  <div key={channel} className="flex items-center gap-3">
                    <input
                      id={key}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={enabled}
                      onChange={(e) => toggle(channel, eventType, e.target.checked)}
                    />
                    <Label htmlFor={key} className="text-sm text-muted-foreground">
                      {channel === "IN_APP" ? "In-app" : "Email"}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
