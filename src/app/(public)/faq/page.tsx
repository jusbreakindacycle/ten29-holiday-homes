import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FaqAccordion } from "@/components/ui/FaqAccordion";
import { getFaqItems } from "@/content/faq";
import { getSiteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about TEN29 Holiday Homes.",
  alternates: { canonical: `${getSiteUrl()}/faq` },
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeading as="h1" eyebrow="FAQ" title="Frequently asked questions" />
      <div className="mt-10">
        <FaqAccordion items={getFaqItems()} />
      </div>
    </div>
  );
}
