import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

const PUBLIC_ROUTES = [
  "",
  "/property",
  "/gallery",
  "/rates",
  "/availability",
  "/policies",
  "/location",
  "/faq",
  "/book",
  "/contact",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.6,
  }));
}
