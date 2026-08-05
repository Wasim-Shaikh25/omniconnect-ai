import { WorkspaceKpis } from "./workspace-kpis";

export function WorkspaceKpisSection({ projectId }: { projectId?: string }) {
  return <WorkspaceKpis projectId={projectId} />;
}
