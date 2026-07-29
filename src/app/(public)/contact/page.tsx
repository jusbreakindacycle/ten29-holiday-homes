import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactCard } from "@/components/ui/ContactCard";
import { CtaLink } from "@/components/ui/CtaButton";
import { CLAIMS, getPublicClaimOrFallback } from "@/content/claims";
import {
  getGoogleMapsUrl,
  getMessengerUrl,
  getPhoneDisplay,
  getPhoneE164,
  getSiteUrl,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact TEN29 Holiday Homes by phone, Messenger, or the enquiry form.",
  alternates: { canonical: `${getSiteUrl()}/contact` },
};

export default function ContactPage() {
  const phoneDisplay = getPhoneDisplay();
  const phoneE164 = getPhoneE164();
  const messenger = getMessengerUrl();
  const maps = getGoogleMapsUrl();
  const hours = getPublicClaimOrFallback(
    CLAIMS.enquiryHours,
    "Hours are being finalized — the enquiry form works any time."
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <SectionHeading
        as="h1"
        eyebrow="Contact"
        title="Talk to TEN29"
        description={`Booking-enquiry support hours: ${hours}.`}
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <ContactCard title="Call or text" description={phoneDisplay} href={`tel:${phoneE164}`} icon="☎" />
        {messenger ? (
          <ContactCard title="Messenger" description="Chat with TEN29 on Facebook" href={messenger} icon="✉" />
        ) : (
          <ContactCard
            title="Messenger"
            description="Facebook link pending confirmation"
            href="#"
            icon="✉"
          />
        )}
        {maps ? (
          <ContactCard title="Google Maps" description="Get directions" href={maps} icon="📍" />
        ) : (
          <ContactCard title="Google Maps" description="Map link pending confirmation" href="#" icon="📍" />
        )}
      </div>

      <div className="mt-10 rounded-sm border border-border bg-sand p-6 text-center">
        <p className="text-ink">Prefer to send full stay details in one go?</p>
        <CtaLink href="/book" className="mt-4 inline-flex">
          Use the Enquiry Form
        </CtaLink>
      </div>
    </div>
  );
}
