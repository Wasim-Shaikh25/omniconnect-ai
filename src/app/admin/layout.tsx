import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user?.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platform Admin</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link href="/admin" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Dashboard
          </Link>
          <Link href="/admin/organizations" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Organizations
          </Link>
          <Link href="/admin/users" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Users
          </Link>
          <Link href="/admin/coupons" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Coupons
          </Link>
          <Link href="/admin/tickets" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Tickets
          </Link>
          <Link href="/admin/logs" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Logs
          </Link>
          <Link href="/admin/ai-usage" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            AI Usage
          </Link>
          <Link href="/admin/health" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Health
          </Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
