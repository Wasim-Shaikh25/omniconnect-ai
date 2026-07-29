import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/modules/auth";
import { getUnreadNotificationCountAction } from "@/modules/notifications";
import { ensureSubscribers } from "@/server/subscribers";

ensureSubscribers();

export const metadata: Metadata = {
  title: "OmniConnect AI",
  description:
    "Meta-first growth platform for creators and merchants. AI-powered content, trend insights, and automated Instagram/Facebook campaigns using real e-commerce data.",
  manifest: "/manifest.webmanifest",
  applicationName: "OmniConnect AI",
  appleWebApp: { capable: true, title: "OmniConnect AI", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  const user = await getCurrentUser();
  const unreadCount = user ? await getUnreadNotificationCountAction() : 0;

  return (
    <html lang="en" nonce={nonce} suppressHydrationWarning>
      <body className="min-h-screen antialiased" nonce={nonce} suppressHydrationWarning>
        <Providers nonce={nonce}>
          <AppShell user={user} unreadCount={unreadCount}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
