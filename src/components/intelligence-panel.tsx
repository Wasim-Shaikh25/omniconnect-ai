import { TodayFeed } from "./today-feed";

export function IntelligencePanel({ storeId }: { storeId?: string }) {
  return <TodayFeed storeId={storeId} />;
}
