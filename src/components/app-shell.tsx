"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { SignOutButton } from "./sign-out-button";
import { ExitImpersonationButton } from "./exit-impersonation-button";
import { ProjectSwitcher } from "./project-switcher";
import { getUnreadNotificationCountAction } from "@/modules/notifications";
import { isRole, type Role } from "@/modules/auth/domain";
import type { SessionUser } from "@/modules/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  Bot,
  Brain,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LineChart,
  Mail,
  Map,
  Menu,
  MessageCircle,
  Settings,
  Store,
  TrendingUp,
  UserCog,
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
  children: React.ReactNode;
}

function parseClientDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function sessionUserFromClient(raw: unknown): SessionUser | null {
  if (typeof raw !== "object" || raw === null) return null;
  const u = raw as Record<string, unknown>;
  if (!u.id || !u.email || typeof u.id !== "string" || typeof u.email !== "string") return null;
  return {
    id: u.id,
    email: u.email,
    name: typeof u.name === "string" ? u.name : null,
    role: isRole(u.role) ? (u.role as Role) : "USER",
    isSuperAdmin: typeof u.isSuperAdmin === "boolean" ? u.isSuperAdmin : false,
    emailVerified: parseClientDate(u.emailVerified),
    phone: typeof u.phone === "string" ? u.phone : null,
    phoneVerified: parseClientDate(u.phoneVerified),
    userId: typeof u.userId === "string" ? u.userId : null,
    projectId: typeof u.projectId === "string" ? u.projectId : null,
    plan: typeof u.plan === "string" ? u.plan : "FREE",
    suspendedAt: parseClientDate(u.suspendedAt),
    banned: typeof u.banned === "boolean" ? u.banned : false,
    impersonatedBy: typeof u.impersonatedBy === "string" ? u.impersonatedBy : null,
    isImpersonating: typeof u.isImpersonating === "boolean" ? u.isImpersonating : false,
  };
}

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession();
  const user = sessionUserFromClient(session?.user);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!user) return;
    getUnreadNotificationCountAction().then(setUnreadCount).catch(() => setUnreadCount(0));
  }, [user]);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:py-6">
            <Link href="/" className="font-bold text-foreground text-lg">
              OmniConnect AI
            </Link>
            <div className="flex items-center gap-3 sm:gap-6">
              <nav className="flex items-center gap-3 sm:gap-6 text-sm">
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline text-muted-foreground hover:text-foreground transition-colors"
                >
                  Create account
                </Link>
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
      items: [
        { href: "/business-brain", label: "Marketing Brain", icon: Brain },
        { href: "/chat", label: "AI Chat", icon: Bot },
      ],
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
        { href: "/analytics/dashboard", label: "AI Dashboard", icon: LineChart },
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
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:bg-surface-elevation/50 hover:text-foreground",
        )}
        aria-label={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
      >
        {active && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-lg bg-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && item.badge ? (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        ) : null}
        {collapsed && item.badge ? (
          <motion.span
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          />
        ) : null}
      </Link>
    );
  };

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <motion.div
        className={cn(
          "flex items-center border-b border-border px-4 py-4",
          collapsed ? "justify-center" : "justify-between"
        )}
        layout
      >
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Link href="/dashboard" className="font-bold text-foreground text-sm">
              OmniConnect
            </Link>
          </motion.div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </motion.div>

      {/* Project Switcher */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ProjectSwitcher currentProjectId={user.projectId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6" aria-label="Main">
        {sections.map((section) => (
          <div key={section.label} className="space-y-2">
            <AnimatePresence>
              {!collapsed && (
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {section.label}
                </motion.h3>
              )}
            </AnimatePresence>
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

      {/* Footer */}
      <motion.div
        className="border-t border-border bg-card px-2 py-4"
        layout
      >
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, marginBottom: 0 }}
              animate={{ opacity: 1, marginBottom: 12 }}
              exit={{ opacity: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 pb-3 border-b border-border"
            >
              <p className="truncate text-xs font-medium text-foreground">
                {user.name || user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2 justify-center">
          <ThemeToggle />
          <SignOutButton variant="ghost" size="sm" className="h-8 w-8" />
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <motion.aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen border-r border-border bg-card transition-all duration-200 md:block",
          collapsed ? "w-16" : "w-64",
        )}
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.2 }}
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile header */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <Link href="/dashboard" className="font-bold text-sm text-foreground">
            OmniConnect
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Dialog.Trigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Open menu" className="h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </Dialog.Trigger>
          </div>
        </header>

        {/* Mobile drawer */}
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 md:hidden" />
          <Dialog.Content asChild>
            <aside className="fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-card md:hidden">
              <Dialog.Title className="sr-only">Main navigation</Dialog.Title>
              <Dialog.Description className="sr-only">
                Navigate the application. Press Escape to close the menu.
              </Dialog.Description>
              <div className="flex items-center justify-end border-b border-border px-4 py-2 md:hidden">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost" size="icon" aria-label="Close menu" className="h-8 w-8">
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
          "flex-1 transition-all duration-200",
          collapsed ? "md:ml-16" : "md:ml-64",
          "pt-14 md:pt-0",
        )}
      >
        {user?.isImpersonating ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Alert variant="default" className="m-4 border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <UserCog className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Impersonation mode</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  You are viewing the app as <strong>{user.email}</strong>. Actions you perform may be
                  attributed to the real account in the audit log.
                </span>
                <ExitImpersonationButton />
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
