import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DailyBriefSection,
  ProductScoreRecord,
  ConversationPattern,
  TrendingHashtag,
  CompetitorChange,
} from "@/modules/intelligence";

export function BriefSectionCard({ section, icon: Icon }: { section: DailyBriefSection; icon: LucideIcon }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {section.title}
        </CardTitle>
        <CardDescription>{section.detail}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xl font-semibold">{section.value}</p>
        {section.change && <p className="text-xs text-muted-foreground">{section.change}</p>}
        {section.cta && (
          <Button asChild variant="outline" size="sm">
            <Link href={section.cta.href}>{section.cta.label}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ProductPromotionCard({
  productScores,
  storeId,
}: {
  productScores: ProductScoreRecord[];
  storeId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">📦</span>
          Products To Push
        </CardTitle>
        <CardDescription>Top products based on customer interest and activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {productScores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet. Sync your catalog.</p>
        ) : (
          <ul className="space-y-3">
            {productScores.map((p) => (
              <li key={p.productId} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{p.productTitle}</p>
                  <span className="text-xs text-muted-foreground">{Math.round(p.compositeScore * 100)} pts</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.evidence}</p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href={`/stores/${storeId}/content`}>Create content</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
          <Link href={`/stores/${storeId}/commerce/catalog`}>View all products</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function DmOpportunityCard({
  patterns,
  storeId,
  title = "DM Insights",
}: {
  patterns: ConversationPattern[];
  storeId: string;
  title?: string;
}) {
  const opportunityCount = patterns.reduce((sum, p) => sum + p.frequency, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">💬</span>
          {title}
        </CardTitle>
        <CardDescription>Patterns detected in customer messages.</CardDescription>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No DM patterns yet.</p>
        ) : (
          <ul className="space-y-3">
            {patterns.map((p) => (
              <li key={p.category} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{p.category.replace(/_/g, " ")}</p>
                  <span className="text-xs text-muted-foreground">{p.frequency}</span>
                </div>
                {p.samplePhrases.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">&ldquo;{p.samplePhrases[0]}&rdquo;</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {opportunityCount > 0 && (
          <p className="mt-3 text-xs text-primary">{opportunityCount} high-intent message(s)</p>
        )}
        <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
          <Link href={`/stores/${storeId}/conversations`}>Open inbox</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function CommentInsightCard({
  patterns,
  storeId,
  title = "Comment Insights",
}: {
  patterns: ConversationPattern[];
  storeId: string;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">🗣️</span>
          {title}
        </CardTitle>
        <CardDescription>Patterns detected in post comments.</CardDescription>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comment patterns yet.</p>
        ) : (
          <ul className="space-y-3">
            {patterns.map((p) => (
              <li key={p.category} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{p.category.replace(/_/g, " ")}</p>
                  <span className="text-xs text-muted-foreground">{p.frequency}</span>
                </div>
                {p.samplePhrases.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">&ldquo;{p.samplePhrases[0]}&rdquo;</p>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
          <Link href={`/stores/${storeId}/commerce/comments`}>View comments</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function CompetitorAlertCard({
  changes,
  storeId,
}: {
  changes: CompetitorChange[];
  storeId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">🚨</span>
          Competitor Changes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No new competitor alerts yet.</p>
        ) : (
          <ul className="space-y-2">
            {changes.map((c, i) => (
              <li key={`${c.trackedAccountId}-${i}`} className="text-sm">
                {c.handle}: {c.changeType}
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href={`/stores/${storeId}/commerce/competitors`}>Track competitors</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function TrendingHashtagCard({ hashtags }: { hashtags: TrendingHashtag[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">#️⃣</span>
          Trending Hashtags
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hashtags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trending hashtags yet.</p>
        ) : (
          <ul className="space-y-2">
            {hashtags.map((h) => (
              <li key={h.tag} className="text-sm flex justify-between">
                <span>#{h.tag}</span>
                <span className="text-muted-foreground">{h.postCount}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function BestTimeCard({ time }: { time: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">🕒</span>
          Best Time To Post
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{time ?? "—"}</p>
        <p className="text-xs text-muted-foreground">Based on recent engagement patterns</p>
      </CardContent>
    </Card>
  );
}

export function FollowerLinkCard({ storeId }: { storeId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">👥</span>
          Followers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">Track followers in Engagement.</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href={`/stores/${storeId}/engagement`}>View</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
