"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { SignOutButton } from "./sign-out-button";
import type { SessionUser } from "@/modules/auth";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  Brain,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Mail,
  Map,
  Menu,
  MessageCircle,
  Settings,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

interface NavSection {
  label: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  admin?: boolean;
}

interface AppShellProps {
  user: SessionUser | null;
  unreadCount?: number;
  children: React.ReactNode;
}

export function AppShell({ user, unreadCount = 0, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b px-4 py-3">
          <div className="container mx-auto flex max-w-5xl items-center justify-between">
            <Link href="/" className="font-semibold">
              OmniConnect AI
            </Link>
            <div className="flex items-center gap-2">
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/login">Sign in</Link>
                <Link href="/register">Create account</Link>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
      </div>
    );
  }

  const sections: NavSection[] = [
    {
      label: "Home",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/daily-marketing", label: "Daily Marketing", icon: CalendarDays },
      ],
    },
    {
      label: "Connect",
      items: [
        { href: "/stores", label: "Stores", icon: Store },
        { href: "/customers", label: "Customers", icon: Users },
      ],
    },
    {
      label: "Create",
      items: [{ href: "/business-brain", label: "Marketing Brain", icon: Brain }],
    },
    {
      label: "Engage",
      items: [
        { href: "/inbox", label: "Inbox", icon: Inbox },
        { href: "/notifications", label: "Notifications", icon: Mail, badge: unreadCount },
      ],
    },
    {
      label: "Analyze",
      items: [
        { href: "/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/analytics/growth", label: "Growth", icon: TrendingUp },
        { href: "/analytics/journeys", label: "Journeys", icon: Map },
        { href: "/reports", label: "Reports", icon: DollarSign },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/settings", label: "Settings", icon: Settings },
        { href: "/support", label: "Support", icon: MessageCircle },
        { href: "/help", label: "Help", icon: HelpCircle },
      ],
    },
  ];

  if (user.isSuperAdmin) {
    const accountSection = sections.find((section) => section.label === "Account");
    if (accountSection) {
      accountSection.items.push({ href: "/admin", label: "Admin", icon: Building2, admin: true });
    }
  }

  const NavLink = ({
    item,
    onClick,
  }: {
    item: NavItem;
    onClick?: () => void;
  }) => {
    const active = pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-label={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && item.badge ? (
          <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] text-destructive-foreground">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        ) : null}
        {collapsed && item.badge ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        ) : null}
      </Link>
    );
  };

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center border-b px-4 py-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link href="/dashboard" className="font-semibold">
            OmniConnect AI
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3" aria-label="Main">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href} className="relative">
                  <NavLink item={item} onClick={onItemClick} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className={cn("flex items-center gap-3", collapsed ? "flex-col" : "justify-between")}>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name || user.email}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton variant="outline" size="sm" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen border-r bg-background transition-all duration-200 md:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <Link href="/dashboard" className="font-semibold">
            OmniConnect AI
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Dialog.Trigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </Dialog.Trigger>
          </div>
        </header>

        {/* Mobile drawer */}
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 md:hidden" />
          <Dialog.Content asChild>
            <aside className="fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-64 border-r bg-background md:hidden">
              <Dialog.Title className="sr-only">Main navigation</Dialog.Title>
              <Dialog.Description className="sr-only">
                Navigate the application. Press Escape to close the menu.
              </Dialog.Description>
              <div className="flex items-center justify-end border-b px-4 py-2 md:hidden">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost" size="icon" aria-label="Close menu">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </Dialog.Close>
              </div>
              <SidebarContent onItemClick={() => setMobileOpen(false)} />
            </aside>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Main content */}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "flex-1 transition-all duration-200 md:ml-64",
          "pt-14 md:pt-0",
        )}
      >
        {children}
      </main>
    </div>
  );
}
