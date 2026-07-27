import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Alert } from "@/components/ui/Alert";
import { EnquiryForm } from "@/components/features/enquiry/EnquiryForm";
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
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading
        eyebrow="Booking enquiry"
        title="Request your dates"
        description="Tell TEN29 what you're looking for. This sends an enquiry, not a reservation — TEN29 will reply with verified availability, price, and payment instructions."
      />

      <div className="mt-8">
        <Alert tone="warning" title="Before you submit">
          {NON_RESERVATION_NOTICE}
        </Alert>
      </div>

      <div className="mt-10 rounded-sm border border-border bg-white p-6 sm:p-8 relative">
        <EnquiryForm
          source={firstValue(params.source)}
          utmSource={firstValue(params.utm_source)}
          utmMedium={firstValue(params.utm_medium)}
          utmCampaign={firstValue(params.utm_campaign)}
        />
      </div>
    </div>
  );
}
