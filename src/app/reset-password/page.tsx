import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";
import { LoadingState } from "@/components/loading-state";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="page-container flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-surface-elevation/30">
        <LoadingState title="Loading reset form…" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
