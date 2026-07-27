"use client";

import { useEffect } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { CtaButton, CtaLink } from "@/components/ui/CtaButton";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Intentionally minimal: no guest personal data is ever available here.
    console.error("Unhandled application error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ivory px-6 text-center">
      <Wordmark />
      <div>
        <h1 className="font-heading text-4xl text-forest">Something went wrong</h1>
        <p className="mt-2 max-w-md text-muted">
          This didn&rsquo;t affect any enquiry you&rsquo;ve already submitted. Please try again, or
          contact TEN29 directly if the problem continues.
        </p>
      </div>
      <div className="flex gap-4">
        <CtaButton onClick={reset}>Try Again</CtaButton>
        <CtaLink href="/contact" variant="secondary">
          Contact TEN29
        </CtaLink>
      </div>
    </div>
  );
}
