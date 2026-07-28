"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold" role="alert" aria-live="assertive">
            Something went wrong
          </h1>
          <p className="mt-2 text-muted-foreground">
            We&apos;re sorry, but an unexpected error occurred.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={reset} type="button">
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
