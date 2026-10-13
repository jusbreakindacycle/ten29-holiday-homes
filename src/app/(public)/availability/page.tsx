import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Alert } from "@/components/ui/Alert";
import { BookingJourney } from "@/components/features/enquiry/BookingJourney";
import { NON_RESERVATION_NOTICE } from "@/content/fallback-copy";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Availability",
  description: "How TEN29 Holiday Homes confirms availability for your requested dates.",
  alternates: { canonical: `${getSiteUrl()}/availability` },
};

export default function AvailabilityPage() {
  return <div className="mx-auto max-w-3xl px-1 py-12 sm:px-6">
    <SectionHeading as="h1" eyebrow="Availability" title="Explore your dates"
      description="Current property-wide availability and owner-published accommodation estimates. Dates remain subject to owner confirmation."/>
    <div className="my-8"><Alert tone="warning" title="Request, not reservation">{NON_RESERVATION_NOTICE}</Alert></div>
    <BookingJourney availabilityOnly/>
  </div>;
}
