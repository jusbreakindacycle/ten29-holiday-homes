# 14 — Design System

## Brand direction

Premium but grounded hospitality look based on the visible TEN29 branding: warm ivory background, dark forest green, muted gold, soft charcoal text, formal borders, generous spacing, restrained shadows, elegant typography, clean mobile cards. No loud gradients. No generic blue SaaS dashboard appearance.

## Color tokens (`src/styles/tokens.css`, exposed as Tailwind theme colors)

| Token | Value | Usage |
|---|---|---|
| `--ten29-forest` | `#0E3A2F` | Primary brand, header/footer background, primary buttons |
| `--ten29-forest-deep` | `#08281F` | Hover/active states, deep backgrounds |
| `--ten29-gold` | `#B88A2F` | Accent, CTA highlights, active nav |
| `--ten29-gold-soft` | `#D8BF82` | Secondary accents, borders on dark backgrounds |
| `--ten29-ivory` | `#F8F5EC` | Page background |
| `--ten29-sand` | `#ECE4D4` | Section alternation, card backgrounds |
| `--ten29-ink` | `#17241F` | Primary text |
| `--ten29-muted` | `#66736D` | Secondary text |
| `--ten29-white` | `#FFFFFF` | Card surfaces on sand/ivory |
| `--ten29-success` | `#2F6B4F` | Success states |
| `--ten29-warning` | `#A6631B` | Pending/attention states |
| `--ten29-danger` | `#9B3B33` | Error/failed states |
| `--ten29-border` | `#D9D2BE` | Hairline borders |

All pairings were chosen to keep body text ≥ 4.5:1 contrast against their background token; see [[12_NON_FUNCTIONAL_REQUIREMENTS]].

## Typography

`next/font/google` with:

- Heading font: **Cormorant Garamond** (elegant serif for `h1`–`h3` and hero copy)
- Body/interface font: **Manrope** (highly readable sans-serif for body text, forms, and UI chrome)

Both are self-hosted via `next/font` at build time (no external font requests at runtime).

## Temporary identity

Until the official high-resolution logo is supplied, the header/footer use a typographic "TEN29" wordmark component (`src/components/brand/Wordmark.tsx`) styled in the heading font with a gold underline accent. It is explicitly labeled as temporary in this document and is the single place to swap in a real logo later — no low-resolution screenshot is traced or reused as a logo.

## Core components (`src/components/`)

Header, Footer, MobileMenu, Hero, SectionHeading, CtaButton, ClaimText / ClaimList (claim-aware fact display), GalleryCard, RateCard, PolicyCard, FaqAccordion, ContactCard, EnquiryForm, FormField, Alert, EmptyState, AdminTable, StatusBadge, OwnerPreviewPanel.

## Responsive behavior

Designed first for common mobile widths (360–430px), then tablet (768px), then desktop (1024px+). Navigation collapses to a MobileMenu below the `md` breakpoint. Forms stack to single-column below `md`.
