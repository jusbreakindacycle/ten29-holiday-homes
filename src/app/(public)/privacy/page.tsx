import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How TEN29 Holiday Homes collects and uses information from your booking enquiry.",
  alternates: { canonical: `${getSiteUrl()}/privacy` },
};

const PRIVACY_CONTACT = process.env.PRIVACY_CONTACT_EMAIL || "(privacy contact pending owner approval)";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 prose-content">
      <SectionHeading eyebrow="Legal" title="Privacy notice" />

      <div className="mt-10 space-y-8 text-ink leading-relaxed">
        <section>
          <h2 className="font-heading text-xl text-forest mb-2">What we collect</h2>
          <p>
            When you submit the booking-enquiry form, TEN29 Holiday Homes collects: your name,
            mobile number, optional email address, requested check-in and check-out dates, number
            of adults, children, and day visitors, number of vehicles, purpose of stay, an optional
            message, and the source of your visit (for example, whether you arrived from Facebook).
            We do not collect government ID, payment proof, bank details, card data, your full
            residential address, or your birth date through this website.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Why we collect it</h2>
          <p>
            This information lets TEN29 review your enquiry, confirm availability manually, and
            contact you with a verified quotation and, if you proceed, payment instructions. It is
            not used for any other purpose.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">This is an enquiry, not a booking</h2>
          <p>
            Submitting this form does not reserve a date and does not create a confirmed booking.
            A stay is only confirmed once TEN29 has verified availability with you directly.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">How long we keep it</h2>
          <p>
            TEN29 currently proposes to retain enquiry records for twelve months from submission,
            for booking-history and customer-service purposes. This retention period is a proposed
            operating rule pending owner approval, not a settled legal commitment.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Who can see it</h2>
          <p>
            Enquiry details are visible only to TEN29&apos;s authorized administrators through a
            password-protected dashboard. They are not sold, rented, or shared with third parties
            for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Your choices</h2>
          <p>
            You can ask TEN29 to review, correct, or delete your enquiry record at any time by
            contacting {PRIVACY_CONTACT}.
          </p>
        </section>
      </div>
    </div>
  );
}
