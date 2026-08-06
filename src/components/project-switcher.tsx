"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { switchProjectAction } from "@/modules/users";
import { listMyStoresAction } from "@/modules/workspaces";

interface ProjectSwitcherProps {
  currentProjectId?: string | null;
}

export function ProjectSwitcher({ currentProjectId }: ProjectSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ organizationName: string; stores: { id: string; name: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyStoresAction()
      .then((result) => {
        if (cancelled) return;
        if ("error" in result) {
          setError(result.error);
        } else {
          setData(result);
        }
      })
      .catch(() => setError("Could not load projects."))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const handleSelect = (projectId: string) => {
    if (projectId === currentProjectId) return;
    const formData = new FormData();
    formData.set("projectId", projectId);
    startTransition(async () => {
      const result = await switchProjectAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !data || data.stores.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        {data?.organizationName ?? "Workspace"}
      </div>
    );
  }

  const selected = data.stores.find((s) => s.id === currentProjectId) ?? data.stores[0];

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <select
        value={selected?.id ?? ""}
        disabled={isPending}
        onChange={(e) => handleSelect(e.target.value)}
        className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
      >
        {data.stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </div>
  );
}
