/**
 * Production asset gate for the authenticated owner-preview page.
 * Mirrors docs/26_PROJECT_STEWARD_DECISION_AND_OWNER_VERIFICATION.md §5 — these
 * are assets/accounts only the actual TEN29 owner can supply, not claims about
 * business values, so they are tracked here rather than in the claim registry.
 */
export interface RequiredAsset {
  name: string;
  websiteUse: string;
  suppliedBy: string;
}

export const OWNER_PREVIEW_REQUIRED_ASSETS: RequiredAsset[] = [
  { name: "Official logo", websiteUse: "Header, footer, favicon source", suppliedBy: "Owner" },
  { name: "Exterior photographs", websiteUse: "Homepage, gallery, property", suppliedBy: "Owner" },
  { name: "Entrance and parking photos", websiteUse: "Property, gallery", suppliedBy: "Owner" },
  { name: "Living room photos", websiteUse: "Property, gallery, homepage", suppliedBy: "Owner" },
  { name: "Kitchen and dining photos", websiteUse: "Property, gallery", suppliedBy: "Owner" },
  { name: "Every bedroom (photo set per bedroom)", websiteUse: "Property, gallery", suppliedBy: "Owner" },
  { name: "Every bed arrangement", websiteUse: "Property", suppliedBy: "Owner" },
  { name: "Every bathroom (photo set per bathroom)", websiteUse: "Property, gallery", suppliedBy: "Owner" },
  { name: "Actual amenities (only those confirmed working)", websiteUse: "Property", suppliedBy: "Owner" },
  {
    name: "Safety equipment (extinguisher, smoke detector, first-aid kit, marked exits)",
    websiteUse: "Property, policies",
    suppliedBy: "Owner",
  },
  { name: "Optional property video", websiteUse: "Property (optional)", suppliedBy: "Owner" },
  { name: "Social-sharing image", websiteUse: "Meta tags", suppliedBy: "Owner (source photo) + developer (crop/encode)" },
  { name: "Favicon", websiteUse: "Browser tab", suppliedBy: "Developer, from owner logo" },
  { name: "Photo-use authorization", websiteUse: "Not published; internal record", suppliedBy: "Owner" },
  { name: "Final Facebook URL", websiteUse: "Header, footer, contact", suppliedBy: "Owner" },
  { name: "Final Instagram URL", websiteUse: "Footer, contact", suppliedBy: "Owner" },
  { name: "Final Google Maps URL", websiteUse: "Location, contact", suppliedBy: "Owner" },
  { name: "Official business email", websiteUse: "Contact, footer", suppliedBy: "Owner" },
  { name: "Privacy contact", websiteUse: "Privacy policy", suppliedBy: "Owner" },
];
