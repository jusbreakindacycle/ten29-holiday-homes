import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { CtaLink } from "@/components/ui/CtaButton";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { PRIMARY_NAV } from "@/lib/navigation";

export function Header() {
  return (
    <header className="relative border-b border-border bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/80 sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Wordmark />

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-ink hover:text-forest transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden md:block">
          <CtaLink href="/book">Request Your Dates</CtaLink>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
