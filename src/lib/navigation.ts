export interface NavItem {
  label: string;
  href: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Property", href: "/property" },
  { label: "Gallery", href: "/gallery" },
  { label: "Rates", href: "/rates" },
  { label: "Location", href: "/location" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export const FOOTER_NAV: NavItem[] = [
  ...PRIMARY_NAV,
  { label: "Availability", href: "/availability" },
  { label: "Policies", href: "/policies" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];
