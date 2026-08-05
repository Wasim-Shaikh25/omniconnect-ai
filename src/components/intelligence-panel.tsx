import { TodayFeed } from "./today-feed";

export function IntelligencePanel({ projectId }: { projectId?: string }) {
  return <TodayFeed projectId={projectId} />;
}
