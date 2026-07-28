"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme={false}
      nonce={nonce}
    >
      {children}
    </ThemeProvider>
  );
}
