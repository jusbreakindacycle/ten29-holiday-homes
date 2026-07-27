# 20 — Risk Register

| Risk | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Unapproved rates accidentally published | Medium | High | Code-enforced claim gate (`isPublicClaim`), automated tests | Developer | Mitigated |
| Incorrect guest capacity published | Medium | High | Capacity fields are `PROPOSED_PENDING_APPROVAL` until owner approval | Developer | Mitigated |
| Incorrect amenity claims | Medium | Medium | Amenities render only from claim registry; fallback copy used otherwise | Developer | Mitigated |
| Copied/stock images used | Low | High | Placeholder-only image policy; asset checklist for owner originals | Developer | Mitigated |
| Exact residential address overexposure | Medium | Medium | Block/lot withheld from public routes by default (`CLM-BIZ-004`) | Developer | Mitigated |
| Restaurant metadata remains on Facebook/Google | High | Medium | Documented repair checklist ([[06_DIGITAL_PRESENCE_REPAIR]]); owner action required | Owner | Open |
| Website perceived as live booking system | Medium | High | Explicit non-reservation copy at every enquiry touchpoint | Developer | Mitigated |
| Lost enquiry due to email failure | Medium | High | Persist-before-notify, notification-failure tracking, tests | Developer | Mitigated |
| Supabase Free project pausing | Medium | Medium | Documented in [[18_DEPLOYMENT_AND_OPERATIONS]]; upgrade path to Pro | Owner | Open |
| Admin credential compromise | Low | High | Supabase Auth, no self-registration, RLS, audit log | Developer | Mitigated |
| Spam form submissions | High | Low | Honeypot + timing check; provider-level rate limiting recommended | Developer | Partially mitigated |
| Public disclosure of service-role key | Low | Critical | Service-role key only in server-only modules; build check for client bundle | Developer | Mitigated |
| Owner account ownership not established | Medium | High | All production accounts created under owner's org/email per [[18_DEPLOYMENT_AND_OPERATIONS]] | Owner | Open until accounts created |
| Domain purchased under developer account | Low | High | Explicit rule: owner purchases domain directly | Owner | Open until purchased |
| Google/Meta account access loss | Low | Medium | Page-history audit checklist, owner retains admin access | Owner | Open |
| Upgrade scope creep into Option 1 | Medium | Medium | Explicit Option 1 exclusions list enforced in charter and code review | Developer | Mitigated |
| Payment automation attempted before merchant approval | Low | High | No payment code exists in Option 1 | Developer | Mitigated |
| AI answering outside approved knowledge (future) | N/A in Option 1 | High | Deferred to Option 3 design; not built here | Developer | Deferred |
| Tagaytay wording misleading customers | Medium | High | Content standard prohibits it; tests scan for banned phrases | Developer | Mitigated |
| Fake or prematurely displayed reviews | Low | High | No review system exists in Option 1 | Developer | Mitigated |
| Unsupported browser/mobile layout | Low | Medium | Mobile-first responsive design, manual acceptance checklist | Developer | Mitigated |
| Owner assumes hosting includes maintenance | Medium | Medium | Explicit statement in [[23_OWNER_HANDOVER]] and README | Developer | Mitigated |
| Third-party price changes (Vercel/Supabase/Resend) | Medium | Low | Documented as "current expectation, not guarantee" | Owner | Open |
| Unresolved high-severity `sharp`/libvips audit findings (bundled via Next.js image processing) | Low | Medium | No public image uploads; owner-controlled trusted assets only; monitor for a compatible Next.js/sharp release; rerun production audit on any dependency change — see detail below | Technical maintainer | Open — accepted for baseline, not permanently resolved |

### Detail: `sharp`/libvips dependency risk

- **Risk:** Next.js 16.2.12 currently resolves `sharp` 0.34.5, whose bundled libvips dependency is covered by unresolved high-severity `npm audit` findings (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 — GHSA-f88m-g3jw-g9cj).
- **Exposure:** `sharp` is reachable through Next.js's built-in image optimization (`next/image`), used in this codebase (`src/components/ui/GalleryCard.tsx`).
- **Current status:** Open and accepted for the technical baseline. Not accepted as permanently resolved.
- **Reason not force-fixed:** The available remediation requires `sharp@0.35.0`, but the installed Next.js release (`16.2.12`) currently constrains its own `sharp` optional dependency to the `0.34.x` line (`^0.34.5`). Forcing `0.35.x` would run a `sharp` version Next.js has not declared support for, and — under 0.x semver, where the second digit is the breaking-change boundary — is a breaking-equivalent jump, not a safe targeted patch. See [[25_EXECUTION_LOG]] for the full audit trail.
- **Current mitigation:**
  - No arbitrary public image uploads in Option 1.
  - Property media remains owner-controlled.
  - Continue using optimized, trusted assets only.
  - Monitor for a compatible Next.js/sharp update.
  - Rerun the production audit (`npm audit --omit=dev`) whenever dependencies change.
- **Owner:** Technical maintainer.
- **Review trigger:** A compatible Next.js/sharp security update becomes available, or before production launch — whichever comes first.
