import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How TEN29 Holiday Homes collects and uses booking requests, reservations and owner-managed media.",
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
            When you submit a booking request, TEN29 Holiday Homes collects: your name,
            mobile number, optional email address, requested check-in and check-out dates, number
            of adults, children, and day visitors, number of vehicles, purpose of stay, an optional
            message, selected bedroom package, folding-foam choice, the current accommodation estimate or missing-rate status, privacy consent, and the source of your visit (for example, whether you arrived from Facebook).
            The guest form does not request card credentials, bank account credentials, government ID, payment-proof uploads, your full residential address or birth date. Authorized administrators may also record contacts from Messenger, phone and other channels, private operational notes, quotations and adjustments, payment amounts and masked references, independent payment-verification events and reservation history.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Why we collect it</h2>
          <p>
            This information supports request review, current availability and price checks, owner-issued quotations, independent payment verification, reservation operations, notifications, audit history and abuse prevention. The public calendar shows property-wide availability and published accommodation rates without guest details. Administrators upload property media and record rights assertions; supported processing removes image location metadata, but people or private information visible in media require owner review before publication.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">This is an enquiry, not a booking</h2>
          <p>
            Submitting this form does not reserve a date and does not create a confirmed booking.
            Confirmation requires an applicable owner-issued quotation, independently verified required down payment, authorized owner action and successful property-wide database conflict checks. Displayed estimates and requested dates are not a reservation.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">How long we keep it</h2>
          <p>
            The owner-approved retention schedule and legal basis remain pending review. No automatic deletion period is currently implemented. Quotations, payment decisions, reservation and audit history are protected from routine editing or deletion; any approved correction or deletion must preserve applicable obligations through a supervised process. Archived media remains private until Storage cleanup succeeds. Database backups and separately backed-up media may require additional controlled retention.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Who can see it</h2>
          <p>
            Private records are restricted to authorized TEN29 administrators by role. Hosting infrastructure processes the application, Supabase processes authentication, database and Storage records, and configured Resend email delivery processes recipient addresses and notification content. Public media may be viewed and downloaded after owner publication; previously downloaded copies cannot be recalled. Production provider accounts, access arrangements and final privacy/legal copy require actual-owner approval before launch.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Your choices</h2>
          <p>
            You may request review, correction or deletion by contacting {PRIVACY_CONTACT}. The final privacy contact, controller identity and request-handling policy require owner/legal approval. No immediate deletion, deadline or legal outcome is promised by this development notice.
          </p>
        </section>
      </div>
    </div>
  );
}
