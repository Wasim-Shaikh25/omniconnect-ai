import { getBestTimeToPostForStore } from "@/modules/analytics/server";

interface ContentBestTimeProps {
  projectId: string;
}

export async function ContentBestTime({ projectId }: ContentBestTimeProps) {
  let windows: Awaited<ReturnType<typeof getBestTimeToPostForStore>> = [];
  try {
    windows = await getBestTimeToPostForStore(projectId);
  } catch {
    windows = [];
  }

  const top = windows.slice(0, 5);

  return (
    <section className="mb-8 rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Best time to post</h2>
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not enough post or order history yet. Publish a few posts and sync orders to see the best windows.
        </p>
      ) : (
        <ul className="space-y-2">
          {top.map((w) => (
            <li key={`${w.dayOfWeek}-${w.hour}`} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">
                  {w.dayOfWeek} at {String(w.hour).padStart(2, "0")}:00 UTC
                </p>
                <p className="text-sm text-muted-foreground">
                  {w.postCount} posts · {w.orderCount} orders · score {Math.round(w.compositeScore)}
                </p>
              </div>
              <span className="text-sm font-medium text-green-600">
                {w.engagementScore > 0 ? `engagement ${Math.round(w.engagementScore)}` : "revenue " + Math.round(w.revenueScore)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
