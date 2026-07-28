import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { getUnreadNotificationCountAction } from "@/modules/notifications";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { SignOutButton } from "./sign-out-button";

export async function AppHeader() {
  const user = await getCurrentUser();
  const unreadCount = user ? await getUnreadNotificationCountAction() : 0;

  const navItems = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/projects", label: "Projects" },
        { href: "/business-brain", label: "Marketing Brain" },
        { href: "/inbox", label: "Inbox" },
        { href: "/stores", label: "Stores" },
        { href: "/customers", label: "Customers" },
        { href: "/reports", label: "Reports" },
        { href: "/support", label: "Support" },
        { href: "/settings", label: "Settings" },
        { href: "/help", label: "Help" },
        { href: "/notifications", label: "Notifications", badge: unreadCount },
        ...(user.isSuperAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [
        { href: "/login", label: "Sign in" },
        { href: "/register", label: "Create account" },
      ];

  return (
    <header className="relative border-b px-4 py-3">
      <div className="container mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="font-semibold">
          OmniConnect AI
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-4 text-sm md:flex">
            {user ? (
              <>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/projects">Projects</Link>
                <Link href="/business-brain">Marketing Brain</Link>
                <Link href="/inbox">Inbox</Link>
                <Link href="/stores">Stores</Link>
                <Link href="/customers">Customers</Link>
                <Link href="/reports">Reports</Link>
                <Link href="/support">Support</Link>
                <Link href="/settings">Settings</Link>
                <Link href="/help">Help</Link>
                {user.isSuperAdmin && <Link href="/admin">Admin</Link>}
                <Link href="/notifications" className="relative">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="absolute -right-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <span className="text-muted-foreground">{user.email}</span>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link href="/login">Sign in</Link>
                <Link href="/register">Create account</Link>
              </>
            )}
          </nav>

          <MobileNav items={navItems} email={user?.email} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
