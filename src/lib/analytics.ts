import { isAnalyticsEnabled } from "@/lib/site-config";

/**
 * No-op analytics abstraction. Nothing is sent anywhere until
 * NEXT_PUBLIC_ENABLE_ANALYTICS=true and a real provider is wired in here.
 * See docs/17_SEO_AND_ANALYTICS.md.
 */
export function trackEvent(name: string, properties?: Record<string, string | number | boolean>): void {
  if (!isAnalyticsEnabled()) return;
  if (typeof window === "undefined") return;
  // Intentionally no provider wired up yet — see docs/17_SEO_AND_ANALYTICS.md.
  void name;
  void properties;
}
