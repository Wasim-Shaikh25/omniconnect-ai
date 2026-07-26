"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface WorkflowLink {
  href: string;
  label: string;
}

export function StoreWorkflowNav({ storeId }: { storeId: string }) {
  const pathname = usePathname();

  const links: WorkflowLink[] = [
    { href: `/stores/${storeId}/daily-marketing`, label: "Daily Marketing" },
    { href: `/stores/${storeId}/engagement`, label: "Engagement" },
    { href: `/stores/${storeId}/growth`, label: "Growth" },
    { href: `/stores/${storeId}/revenue`, label: "Revenue" },
  ];

  return (
    <nav
      className="flex flex-wrap gap-2 border-b pb-2"
      aria-label="Marketing workflows"
    >
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
