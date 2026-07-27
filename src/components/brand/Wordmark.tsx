import Link from "next/link";
import { clsx } from "clsx";

/**
 * Temporary typographic wordmark — TEN29 has not yet supplied a final
 * high-resolution logo. This is the single place to swap in a real logo
 * later. See docs/14_DESIGN_SYSTEM.md.
 */
export function Wordmark({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={clsx(
        "font-heading text-2xl font-semibold tracking-wide inline-flex items-baseline gap-1",
        dark ? "text-ivory" : "text-forest",
        className
      )}
    >
      <span>TEN29</span>
      <span
        className={clsx(
          "text-sm font-sans font-medium tracking-widest uppercase border-b-2 pb-0.5",
          dark ? "text-gold-soft border-gold-soft" : "text-gold border-gold"
        )}
      >
        Holiday Homes
      </span>
    </Link>
  );
}
