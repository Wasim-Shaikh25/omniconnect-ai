"use client";

import type { MarketingPerformanceView } from "@/modules/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonViewer } from "./json-viewer";

interface ReportViewProps {
  content: Record<string, unknown>;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
  }).format(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function ReportView({ content }: ReportViewProps) {
  if (!isObject(content)) {
    return <JsonViewer data={content} />;
  }

  const report = content as unknown as MarketingPerformanceView;
  const generatedAt =
    typeof report.generatedAt === "string"
      ? new Date(report.generatedAt)
      : report.generatedAt instanceof Date
        ? report.generatedAt
        : new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            report.dataQuality === "live"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
              : report.dataQuality === "partial"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {report.dataQuality ?? "unknown"}
        </span>
        <span className="text-muted-foreground">Generated {generatedAt.toLocaleString()}</span>
      </div>

      {report.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{report.summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {report.content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
              <CardDescription>{formatNumber(report.content.totalPosts)} posts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{report.content.why}</p>
              {report.content.topPosts && report.content.topPosts.length > 0 && (
                <div>
                  <p className="font-medium">Top posts</p>
                  <ul className="mt-1 space-y-1">
                    {report.content.topPosts.slice(0, 5).map((post, index) => (
                      <li key={index} className="text-xs">
                        <span className="font-medium">#{index + 1}</span>{" "}
                        {post.caption ? `${post.caption.slice(0, 60)}…` : "(no caption)"} ·{" "}
                        {formatNumber(post.engagement)} engagement
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {report.audience && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audience</CardTitle>
              <CardDescription>{formatNumber(report.audience.followers)} followers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">New this week</span>
                  <p>{formatNumber(report.audience.newFollowersThisWeek)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Customers</span>
                  <p>{formatNumber(report.audience.customers)}</p>
                </div>
              </div>
              <p className="text-muted-foreground">{report.audience.why}</p>
            </CardContent>
          </Card>
        )}

        {report.product && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product</CardTitle>
              <CardDescription>{formatCurrency(report.product.revenue, report.product.currency)} revenue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Orders</span>
                  <p>{formatNumber(report.product.orders)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">AOV</span>
                  <p>{formatCurrency(report.product.aov, report.product.currency)}</p>
                </div>
              </div>
              {report.product.topProductByRevenue && (
                <p className="text-xs">
                  Top product: <span className="font-medium">{report.product.topProductByRevenue.title}</span> ·{" "}
                  {formatCurrency(report.product.topProductByRevenue.revenue, report.product.currency)}
                </p>
              )}
              <p className="text-muted-foreground">{report.product.why}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {report.campaign && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaigns</CardTitle>
            <CardDescription>{formatNumber(report.campaign.activeCampaigns)} active</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <span className="text-xs text-muted-foreground">Coupons generated</span>
                <p>{formatNumber(report.campaign.couponsGenerated)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Coupons used</span>
                <p>{formatNumber(report.campaign.couponsUsed)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Conversion rate</span>
                <p>
                  {report.campaign.couponConversionRate !== null && report.campaign.couponConversionRate !== undefined
                    ? `${(report.campaign.couponConversionRate * 100).toFixed(2)}%`
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Coupon revenue</span>
                <p>{formatCurrency(report.campaign.couponRevenue, report.product?.currency)}</p>
              </div>
            </div>
            <p className="text-muted-foreground">{report.campaign.why}</p>
          </CardContent>
        </Card>
      )}

      {report.explanation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Explanation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.explanation}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
