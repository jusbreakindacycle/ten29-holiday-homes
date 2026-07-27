"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f8f5ec] px-6 text-center font-sans text-[#17241f]">
        <h1 className="text-3xl font-semibold">TEN29 Holiday Homes</h1>
        <p className="max-w-md">
          Something went wrong loading this page. Please try again in a moment.
        </p>
        <button
          onClick={reset}
          className="rounded-sm border border-[#0e3a2f] bg-[#0e3a2f] px-6 py-3 text-sm font-semibold text-[#f8f5ec]"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
