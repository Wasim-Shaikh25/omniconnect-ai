"use client";

import { useState } from "react";
import { createAttributionLinkAction } from "@/modules/attribution";
import type { CouponRecord } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AttributionLinkFormProps {
  projectId: string;
  coupons: CouponRecord[];
}

export function AttributionLinkForm({ projectId, coupons }: AttributionLinkFormProps) {
  const [couponId, setCouponId] = useState<string>("");
  const [utmSource, setUtmSource] = useState("instagram");
  const [utmMedium, setUtmMedium] = useState("bio");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    const state = await createAttributionLinkAction({
      projectId,
      couponId: couponId || null,
      utmSource,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
    });
    setPending(false);
    if (state.ok && state.link) {
      setResult({ url: state.link.fullUrl });
      setUtmCampaign("");
    } else {
      setResult({ error: state.error ?? "Failed to create link" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="coupon">Coupon (optional)</Label>
          <select
            id="coupon"
            value={couponId}
            onChange={(e) => setCouponId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">No coupon</option>
            {coupons
              .filter((c) => c.status === "ACTIVE")
              .map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.code} ({coupon.discountPct}%)
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="utmSource">UTM source *</Label>
          <Input
            id="utmSource"
            value={utmSource}
            onChange={(e) => setUtmSource(e.target.value)}
            required
            placeholder="e.g. instagram"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="utmMedium">UTM medium</Label>
          <Input
            id="utmMedium"
            value={utmMedium}
            onChange={(e) => setUtmMedium(e.target.value)}
            placeholder="e.g. bio"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="utmCampaign">UTM campaign</Label>
          <Input
            id="utmCampaign"
            value={utmCampaign}
            onChange={(e) => setUtmCampaign(e.target.value)}
            placeholder="e.g. summer-sale"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending || !utmSource.trim()}>
        {pending ? "Creating..." : "Create link"}
      </Button>

      {result?.url && (
        <p className="text-sm text-green-600">
          Link created:{" "}
          <a href={result.url} target="_blank" rel="noreferrer" className="underline">
            {result.url}
          </a>
        </p>
      )}
      {result?.error && (
        <p className="text-sm text-destructive" role="alert">
          {result.error}
        </p>
      )}
    </form>
  );
}
