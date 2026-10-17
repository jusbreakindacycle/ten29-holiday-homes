import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Alert } from "@/components/ui/Alert";
import { BookingJourney } from "@/components/features/enquiry/BookingJourney";
import { NON_RESERVATION_NOTICE } from "@/content/fallback-copy";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Request Your Dates",
  description: "Send TEN29 Holiday Homes a booking enquiry for your preferred dates.",
  alternates: { canonical: `${getSiteUrl()}/book` },
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl px-1 py-12 sm:px-6">
      <SectionHeading
        as="h1"
        eyebrow="Booking enquiry"
        title="Request your dates"
        description="Tell TEN29 what you're looking for. This sends an enquiry, not a reservation — TEN29 will review availability and issue the final quotation before payment terms are agreed."
      />

      <div className="mt-8">
        <Alert tone="warning" title="Before you submit">
          {NON_RESERVATION_NOTICE}
        </Alert>
      </div>

      <div className="mt-10 relative">
        <BookingJourney initial={Object.fromEntries(Object.entries(params).map(([key, value]) => [key, firstValue(value)]))}
          utm={{ utm_source: firstValue(params.utm_source) || firstValue(params.source), utm_medium: firstValue(params.utm_medium), utm_campaign: firstValue(params.utm_campaign) }}/>

      </div>
    </div>
  );
}
