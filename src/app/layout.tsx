import type { Metadata } from "next";
import localFont from "next/font/local";
import { getSiteName, getSiteUrl } from "@/lib/site-config";
import "./globals.css";

// Same established families, bundled with OFL licenses for deterministic builds.
const cormorant = localFont({
  src: "./fonts/CormorantGaramond.ttf",
  variable: "--font-cormorant",
  weight: "500 700",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const manrope = localFont({
  src: "./fonts/Manrope.ttf",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: getSiteName(),
    template: `%s | ${getSiteName()}`,
  },
  description:
    "TEN29 Holiday Homes is a holiday-home stay in Biclatan, General Trias, Cavite. Request your dates directly with the owner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ivory text-ink">{children}</body>
    </html>
  );
}
