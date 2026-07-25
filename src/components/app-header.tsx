import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { getUnreadNotificationCountAction } from "@/modules/notifications";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";

export async function AppHeader() {
  const user = await getCurrentUser();
  const unreadCount = user ? await getUnreadNotificationCountAction() : 0;

  return (
    <header className="border-b px-4 py-3">
      <div className="container mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="font-semibold">
          OmniConnect AI
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/business-brain">AI Brain</Link>
              <Link href="/inbox">Inbox</Link>
              <Link href="/stores">Stores</Link>
              <Link href="/customers">Customers</Link>
              <Link href="/help">Help</Link>
              <Link href="/notifications" className="relative">
                Notifications
                {unreadCount > 0 && (
                  <span className="absolute -right-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <span className="text-muted-foreground">{user.email}</span>
              <form action="/api/auth/signout" method="post">
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/register">Create account</Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
