"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormEvent } from "react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  search?: string;
  limit?: number;
}

function buildQuery(
  params: URLSearchParams,
  changes: Record<string, string | undefined>,
): string {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}

export function PaginationControls({
  page,
  totalPages,
  total,
  search,
  limit = 10,
}: PaginationControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(p: number) {
    const q = buildQuery(new URLSearchParams(searchParams.toString()), {
      page: p > 1 ? String(p) : undefined,
      q: search || undefined,
      limit: String(limit),
    });
    router.push(`${pathname}${q}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total} result{total === 1 ? "" : "s"} · page {page} of {totalPages || 1}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || totalPages === 0}
          onClick={() => go(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function ListSearch({
  placeholder = "Search...",
  defaultValue = "",
  limit = 10,
}: {
  placeholder?: string;
  defaultValue?: string;
  limit?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const q = String(form.get("q") ?? "").trim();
    const query = buildQuery(new URLSearchParams(searchParams.toString()), {
      q: q || undefined,
      page: undefined,
      limit: String(limit),
    });
    router.push(`${pathname}${query}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="max-w-xs"
      />
      <Button type="submit" variant="outline" size="sm" className="shrink-0">
        Search
      </Button>
      {defaultValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const query = buildQuery(new URLSearchParams(searchParams.toString()), {
              q: undefined,
              page: undefined,
            });
            router.push(`${pathname}${query}`);
          }}
        >
          Clear
        </Button>
      )}
    </form>
  );
}
