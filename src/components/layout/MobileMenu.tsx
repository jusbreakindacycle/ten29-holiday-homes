"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { PRIMARY_NAV } from "@/lib/navigation";
import { CtaLink } from "@/components/ui/CtaButton";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-forest/30 p-2 text-forest transition-colors hover:bg-forest/5"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none">
          {open ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-ivory px-6 py-6 shadow-lg"
        >
          <ul className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "block min-h-11 rounded-sm px-2 py-2.5 text-lg font-medium transition-colors",
                      isActive ? "bg-sand text-forest" : "text-ink hover:bg-sand/60 hover:text-forest"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <CtaLink href="/book" className="mt-6 w-full">
            Request Your Dates
          </CtaLink>
        </nav>
      ) : null}
    </div>
  );
}
