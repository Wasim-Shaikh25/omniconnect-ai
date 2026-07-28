import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { AppHeader } from "@/components/app-header";
import { ensureSubscribers } from "@/server/subscribers";

ensureSubscribers();

export const metadata: Metadata = {
  title: "OmniConnect AI",
  description:
    "Intelligent bridge between Meta platforms and eCommerce — AI-powered customer engagement, coupons, and marketing insights.",
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

  return (
    <html lang="en" nonce={nonce} suppressHydrationWarning>
      <body className="min-h-screen antialiased" nonce={nonce} suppressHydrationWarning>
        <Providers nonce={nonce}>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
