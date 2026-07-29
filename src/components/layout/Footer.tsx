import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { FOOTER_NAV } from "@/lib/navigation";
import {
  getFacebookUrl,
  getGoogleMapsUrl,
  getInstagramUrl,
  getPhoneDisplay,
  getPhoneE164,
  getPublicAddress,
} from "@/lib/site-config";

export function Footer() {
  const phoneDisplay = getPhoneDisplay();
  const phoneE164 = getPhoneE164();
  const address = getPublicAddress();
  const facebook = getFacebookUrl();
  const instagram = getInstagramUrl();
  const maps = getGoogleMapsUrl();
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-forest text-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 sm:py-14 md:grid-cols-4 md:gap-8">
        <div className="sm:col-span-2 md:col-span-1">
          <Wordmark dark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/70">
            A holiday-home stay in Biclatan, General Trias, Cavite. Requesting a stay is an
            enquiry, not an instant reservation.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gold-soft">
            Explore
          </h2>
          <ul className="space-y-2.5 text-sm">
            {FOOTER_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-block rounded-sm text-ivory/80 transition-colors hover:text-ivory"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gold-soft">
            Contact
          </h2>
          <ul className="space-y-2.5 text-sm text-ivory/80">
            <li>
              <a href={`tel:${phoneE164}`} className="inline-block rounded-sm hover:text-ivory">
                {phoneDisplay}
              </a>
            </li>
            <li className="leading-relaxed">{address}</li>
            {maps ? (
              <li>
                <a
                  href={maps}
                  className="inline-block rounded-sm hover:text-ivory"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Google Maps
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gold-soft">
            Follow
          </h2>
          <ul className="space-y-2.5 text-sm text-ivory/80">
            {facebook ? (
              <li>
                <a
                  href={facebook}
                  className="inline-block rounded-sm hover:text-ivory"
                  target="_blank"
                  rel="noreferrer"
                >
                  Facebook
                </a>
              </li>
            ) : null}
            {instagram ? (
              <li>
                <a
                  href={instagram}
                  className="inline-block rounded-sm hover:text-ivory"
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              </li>
            ) : null}
            {!facebook && !instagram ? (
              <li className="text-ivory/50">Social links pending confirmation.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-2 px-6 py-5 text-center text-xs text-ivory/60 sm:flex-row sm:justify-between sm:text-left">
          <p>&copy; {year} TEN29 Holiday Homes. All rights reserved.</p>
          <p>Rates, availability, and policies are subject to manual confirmation.</p>
        </div>
      </div>
    </footer>
  );
}
