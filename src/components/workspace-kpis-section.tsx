import { WorkspaceKpis } from "./workspace-kpis";

export function WorkspaceKpisSection({ storeId }: { storeId?: string }) {
  return <WorkspaceKpis storeId={storeId} />;
}
