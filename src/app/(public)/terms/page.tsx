import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for the TEN29 Holiday Homes website and enquiry form.",
  alternates: { canonical: `${getSiteUrl()}/terms` },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading eyebrow="Legal" title="Terms of use" />

      <div className="mt-10 space-y-8 text-ink leading-relaxed">
        <section>
          <h2 className="font-heading text-xl text-forest mb-2">What this website is</h2>
          <p>
            This website presents information about TEN29 Holiday Homes and lets visitors submit a
            booking request using current property-wide availability and owner-published nightly estimates.
            It does not provide instant reservations or process payments. Property claims and
            commercial policies remain subject to their applicable owner-approval gates.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Enquiries, not reservations</h2>
          <p>
            Submitting the enquiry form sends a request to TEN29. It does not place a hold on any
            date, does not create a binding reservation, and does not constitute acceptance of any
            price. Final confirmation requires an applicable owner-issued quotation, independently
            verified required down payment, authorized owner action and successful atomic database
            availability checks. The owner communicates the result directly.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Payments</h2>
          <p>
            This website does not process payments and does not accept payment proof or screenshots.
            Any payment is arranged directly with TEN29 using the instructions TEN29 provides after
            reviewing your request and issuing the applicable quotation and payment conditions.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Accuracy</h2>
          <p>
            TEN29 works to keep this website accurate and will correct errors when identified.
            Content that has not yet been verified or approved by the property owner is shown as
            pending rather than presented as fact.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl text-forest mb-2">Contact</h2>
          <p>Questions about these terms can be sent through the Contact page.</p>
        </section>
      </div>
    </div>
  );
}
