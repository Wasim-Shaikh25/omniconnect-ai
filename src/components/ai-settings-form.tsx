"use client";

import { useState, useActionState } from "react";
import type { AIActionState, AIConfigurationRecord } from "@/modules/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (
  prev: AIActionState,
  formData: FormData,
) => Promise<AIActionState>;

interface AISettingsFormProps {
  action: Action;
  projectId: string;
  defaultValues: AIConfigurationRecord;
}

export function AISettingsForm({
  action,
  projectId,
  defaultValues,
}: AISettingsFormProps) {
  const [config, setConfig] = useState(defaultValues);
  const [state, formAction, pending] = useActionState<AIActionState, FormData>(
    action,
    {},
  );

  const updateField = <K extends keyof AIConfigurationRecord>(
    key: K,
    value: AIConfigurationRecord[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateSkill = (key: keyof AIConfigurationRecord["enabledSkills"], value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      enabledSkills: { ...prev.enabledSkills, [key]: value },
    }));
  };

  const updateSales = (key: keyof AIConfigurationRecord["salesRules"], value: number | boolean) => {
    setConfig((prev) => ({ ...prev, salesRules: { ...prev.salesRules, [key]: value } }));
  };

  const updateChannel = (
    channel: keyof AIConfigurationRecord["channelSettings"],
    key: keyof AIConfigurationRecord["channelSettings"]["instagram"],
    value: string | boolean,
  ) => {
    setConfig((prev) => ({
      ...prev,
      channelSettings: {
        ...prev.channelSettings,
        [channel]: { ...prev.channelSettings[channel], [key]: value },
      },
    }));
  };

  const updateEscalation = (key: keyof AIConfigurationRecord["escalationRules"], value: boolean | string | null) => {
    setConfig((prev) => ({
      ...prev,
      escalationRules: { ...prev.escalationRules, [key]: value },
    }));
  };

  const updateModelOverride = (key: keyof AIConfigurationRecord["modelOverrides"], value: string) => {
    setConfig((prev) => ({
      ...prev,
      modelOverrides: { ...prev.modelOverrides, [key]: value || undefined },
    }));
  };

  const handleSubmit = (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    const formData = new FormData(evt.currentTarget);
    formData.append("projectId", projectId);
    formData.append("config", JSON.stringify(config));
    formAction(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">General</h3>
        <div className="space-y-2">
          <Label htmlFor="aiName">AI name</Label>
          <Input
            id="aiName"
            value={config.aiName ?? ""}
            onChange={(e) => updateField("aiName", e.target.value || null)}
            placeholder="e.g. Ava"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandVoice">Brand voice</Label>
          <Input
            id="brandVoice"
            value={config.brandVoice ?? ""}
            onChange={(e) => updateField("brandVoice", e.target.value || null)}
            placeholder="friendly, professional, playful"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Input
            id="language"
            value={config.language}
            onChange={(e) => updateField("language", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Default model</Label>
          <Input
            id="model"
            value={config.model}
            onChange={(e) => updateField("model", e.target.value)}
            placeholder="openai/gpt-4o-mini"
          />
          <p className="text-xs text-muted-foreground">
            Per-skill overrides below take precedence.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Personality prompt</h3>
        <p className="text-xs text-muted-foreground">
          Use variables: {"{{ai_name}}"}, {"{{brand_name}}"}, {"{{product_count}}"}, {"{{top_products}}"}, {"{{store_url}}"}.
        </p>
        <textarea
          id="systemPrompt"
          rows={6}
          value={config.systemPrompt}
          onChange={(e) => updateField("systemPrompt", e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          required
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Skills & permissions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(config.enabledSkills).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => updateSkill(key as keyof AIConfigurationRecord["enabledSkills"], e.target.checked)}
                className="h-4 w-4"
              />
              <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Sales guardrails</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maxDiscountPct">Max discount %</Label>
            <Input
              id="maxDiscountPct"
              type="number"
              min={0}
              max={100}
              value={config.salesRules.maxDiscountPct}
              onChange={(e) => updateSales("maxDiscountPct", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxUses">Max uses per coupon</Label>
            <Input
              id="maxUses"
              type="number"
              min={1}
              value={config.salesRules.maxUses}
              onChange={(e) => updateSales("maxUses", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dailyBudget">Daily coupon budget ($)</Label>
            <Input
              id="dailyBudget"
              type="number"
              min={0}
              value={config.salesRules.dailyBudget}
              onChange={(e) => updateSales("dailyBudget", Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="autoSend"
              type="checkbox"
              checked={config.salesRules.autoSend}
              onChange={(e) => updateSales("autoSend", e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="autoSend" className="font-normal">Auto-send coupons</Label>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Channel settings</h3>
        {Object.entries(config.channelSettings).map(([channel, setting]) => (
          <div key={channel} className="rounded border p-4">
            <h4 className="mb-2 font-medium capitalize">{channel}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={setting.enabled}
                  onChange={(e) => updateChannel(channel as keyof AIConfigurationRecord["channelSettings"], "enabled", e.target.checked)}
                  className="h-4 w-4"
                />
                Enabled
              </label>
              <div className="space-y-2">
                <Label className="text-xs">Tone override</Label>
                <Input
                  value={setting.tone}
                  onChange={(e) => updateChannel(channel as keyof AIConfigurationRecord["channelSettings"], "tone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Business hours start</Label>
                <Input
                  type="time"
                  value={setting.businessHoursStart ?? ""}
                  onChange={(e) => updateChannel(channel as keyof AIConfigurationRecord["channelSettings"], "businessHoursStart", e.target.value || "")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Business hours end</Label>
                <Input
                  type="time"
                  value={setting.businessHoursEnd ?? ""}
                  onChange={(e) => updateChannel(channel as keyof AIConfigurationRecord["channelSettings"], "businessHoursEnd", e.target.value || "")}
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Escalation rules</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.escalationRules.onComplaint}
              onChange={(e) => updateEscalation("onComplaint", e.target.checked)}
              className="h-4 w-4"
            />
            On complaint
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.escalationRules.onRefundRequest}
              onChange={(e) => updateEscalation("onRefundRequest", e.target.checked)}
              className="h-4 w-4"
            />
            On refund request
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.escalationRules.onLowConfidence}
              onChange={(e) => updateEscalation("onLowConfidence", e.target.checked)}
              className="h-4 w-4"
            />
            On low confidence
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.escalationRules.notifyPush}
              onChange={(e) => updateEscalation("notifyPush", e.target.checked)}
              className="h-4 w-4"
            />
            Push notifications
          </label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notifyEmail">Notify email</Label>
          <Input
            id="notifyEmail"
            type="email"
            value={config.escalationRules.notifyEmail ?? ""}
            onChange={(e) => updateEscalation("notifyEmail", e.target.value || null)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Knowledge base</h3>
        <textarea
          id="knowledgeBase"
          rows={4}
          value={config.knowledgeBase ?? ""}
          onChange={(e) => updateField("knowledgeBase", e.target.value || null)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          placeholder="Custom instructions, policies, FAQ..."
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Model overrides</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["reply", "content", "dashboard", "inspector", "analysis"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`model-${key}`} className="capitalize">{key}</Label>
              <Input
                id={`model-${key}`}
                value={config.modelOverrides[key] ?? ""}
                onChange={(e) => updateModelOverride(key, e.target.value)}
                placeholder={`Default: ${config.model}`}
              />
            </div>
          ))}
        </div>
      </section>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green-600">{state.message}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save AI configuration"}
      </Button>
    </form>
  );
}
