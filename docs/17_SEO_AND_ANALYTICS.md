# 17 — SEO and Analytics

## Implemented

- Unique metadata per route via Next.js `generateMetadata`/`metadata` exports.
- Title template: `"%s | TEN29 Holiday Homes"`.
- Meta descriptions per route, written from approved/fallback content only.
- Canonical URLs derived from `NEXT_PUBLIC_SITE_URL`.
- Open Graph tags (title, description, url, site name, image) per route.
- Social preview fallback image when no owner-approved property photo exists yet.
- `sitemap.xml` (public routes only, `src/app/sitemap.ts`).
- `robots.txt` (`src/app/robots.ts`) — disallows `/admin`.
- Clean semantic URLs (see [[07_INFORMATION_ARCHITECTURE]]).
- Correct heading hierarchy per page.
- Local location terms centered on Biclatan and General Trias.
- Environment-configured search-console verification token (`NEXT_PUBLIC_SITE_URL`-relative meta tag, value from env, empty/absent by default).
- Analytics abstraction (`src/lib/analytics.ts`) — no-ops until `NEXT_PUBLIC_ENABLE_ANALYTICS=true` and a provider is wired in; nothing is sent by default.
- UTM capture on `/book` and inquiry source tracking (see [[09_DATA_MODEL]]).

## Structured data

- Conservative `LocalBusiness`-style JSON-LD on the homepage, built only from `VERIFIED`/`APPROVED_FOR_PUBLICATION` claims (name, phone, address locality/region/postal code, url).
- No ratings, reviews, prices, or occupancy numbers are added to structured data while those claims remain unapproved.
- No assumption of eligibility for Google's specialized vacation-rental rich results — Option 1 intentionally uses the conservative schema, not a lodging-specific schema that implies live pricing/availability integration.
- `tests/unit/jsonld.test.ts` validates that the emitted JSON-LD contains no field sourced from a non-public claim.

## Proposed keyword themes (documentation only — not keyword-stuffed into copy)

holiday home General Trias · staycation General Trias · private stay Biclatan · family stay Cavite · accommodation near Amadeo · General Trias holiday home. "Near Tagaytay" is used carefully and only ever as secondary access positioning, consistent with [[04_BUSINESS_POSITIONING]].
