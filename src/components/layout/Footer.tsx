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
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Wordmark dark />
          <p className="mt-4 text-sm text-ivory/70 leading-relaxed">
            A holiday-home stay in Biclatan, General Trias, Cavite. Requesting a stay is an
            enquiry, not an instant reservation.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-soft mb-3">
            Explore
          </h2>
          <ul className="space-y-2 text-sm">
            {FOOTER_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ivory/80 hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-soft mb-3">
            Contact
          </h2>
          <ul className="space-y-2 text-sm text-ivory/80">
            <li>
              <a href={`tel:${phoneE164}`} className="hover:text-ivory">
                {phoneDisplay}
              </a>
            </li>
            <li>{address}</li>
            {maps ? (
              <li>
                <a href={maps} className="hover:text-ivory" target="_blank" rel="noreferrer">
                  View on Google Maps
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-soft mb-3">
            Follow
          </h2>
          <ul className="space-y-2 text-sm text-ivory/80">
            {facebook ? (
              <li>
                <a href={facebook} className="hover:text-ivory" target="_blank" rel="noreferrer">
                  Facebook
                </a>
              </li>
            ) : null}
            {instagram ? (
              <li>
                <a href={instagram} className="hover:text-ivory" target="_blank" rel="noreferrer">
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
        <div className="mx-auto max-w-6xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ivory/60">
          <p>&copy; {year} TEN29 Holiday Homes. All rights reserved.</p>
          <p>Rates, availability, and policies are subject to manual confirmation.</p>
        </div>
      </div>
    </footer>
  );
}
