"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Wordmark } from "@/components/brand/Wordmark";
import { CtaLink } from "@/components/ui/CtaButton";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { PRIMARY_NAV } from "@/lib/navigation";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="relative border-b border-border bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/80 sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Wordmark />

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-4 lg:gap-7">
            {PRIMARY_NAV.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "relative inline-block rounded-sm px-0.5 py-1.5 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gold after:transition-transform after:content-['']",
                      isActive
                        ? "text-forest after:scale-x-100"
                        : "text-ink after:scale-x-0 hover:text-forest hover:after:scale-x-100"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
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
