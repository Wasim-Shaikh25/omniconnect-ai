"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

interface MobileNavProps {
  items: NavItem[];
  email?: string | null;
}

export function MobileNav({ items, email }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </Button>

      {open && (
        <nav className="absolute left-0 right-0 top-14 z-50 border-b bg-background px-4 py-4 shadow-sm">
          <ul className="space-y-3 text-sm">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between py-1"
                  onClick={() => setOpen(false)}
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] text-destructive-foreground">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
            {email ? (
              <>
                <li className="border-t pt-2 text-muted-foreground">
                  {email}
                </li>
                <li>
                  <form action="/api/auth/signout" method="post">
                    <Button type="submit" variant="ghost" size="sm" className="px-0">
                      Sign out
                    </Button>
                  </form>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/register" onClick={() => setOpen(false)}>
                    Create account
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
}
