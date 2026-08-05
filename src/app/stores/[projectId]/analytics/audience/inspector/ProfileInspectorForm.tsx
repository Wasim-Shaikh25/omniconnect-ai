"use client";

import { useActionState } from "react";
import { inspectProfileAction, type InspectProfileState } from "@/modules/inspector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProfileInspectorFormProps {
  projectId: string;
}

function confidenceColor(confidence: "high" | "medium" | "low"): string {
  switch (confidence) {
    case "high":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
    default:
      return "bg-red-100 text-red-800";
  }
}

export function ProfileInspectorForm({ projectId }: ProfileInspectorFormProps) {
  const [state, submitAction, isPending] = useActionState<InspectProfileState, FormData>(
    inspectProfileAction,
    {},
  );

  return (
    <div className="space-y-6">
      <form action={submitAction} className="flex max-w-md flex-col gap-4">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Instagram username</Label>
          <Input id="username" name="username" placeholder="e.g. nike" required />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Inspecting..." : "Inspect profile"}
        </Button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>

      {state.result && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>@{state.result.username}</span>
                <Badge className={confidenceColor(state.result.audienceQuality.label)}>
                  {state.result.audienceQuality.label} quality
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Followers</p>
                  <p className="text-2xl font-semibold">{state.result.followerCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Engagement rate</p>
                  <p className="text-2xl font-semibold">{(state.result.engagementRate * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Growth trend</p>
                  <p className="text-2xl font-semibold capitalize">{state.result.growthTrend}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Audience quality</p>
                <p>
                  score {(state.result.audienceQuality.score * 100).toFixed(0)}/100 · confidence{" "}
                  {(state.result.audienceQuality.confidence * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Narration</p>
                <p className="text-sm leading-relaxed">{state.result.narration}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top content</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {state.result.topContent.slice(0, 5).map((item, index) => (
                  <li key={index} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{item.type}</span>
                    <span className="font-medium">{item.engagement}</span>
                  </li>
                ))}
                {state.result.topContent.length === 0 && (
                  <p className="text-sm text-muted-foreground">No content available.</p>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>
                Estimated demographics
                <Badge className={`ml-2 ${confidenceColor(state.result.demographics.confidence)}`}>
                  {state.result.demographics.confidence} confidence
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Top cities</p>
                  <ul className="text-sm">
                    {state.result.demographics.topCities.map((c, i) => (
                      <li key={i}>{c.city} ({c.percentage}%)</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Top countries</p>
                  <ul className="text-sm">
                    {state.result.demographics.topCountries.map((c, i) => (
                      <li key={i}>{c.country} ({c.percentage}%)</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age ranges</p>
                  <ul className="text-sm">
                    {state.result.demographics.ageRanges.map((a, i) => (
                      <li key={i}>{a.range} ({a.percentage}%)</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender split</p>
                  <ul className="text-sm">
                    <li>Male {state.result.demographics.genderSplit.male}%</li>
                    <li>Female {state.result.demographics.genderSplit.female}%</li>
                    <li>Other {state.result.demographics.genderSplit.other}%</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
