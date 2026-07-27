import Link from "next/link";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-forest text-ivory hover:bg-forest-deep border border-forest",
  secondary: "bg-transparent text-forest border border-forest hover:bg-sand",
  ghost: "bg-transparent text-forest underline underline-offset-4 hover:text-forest-deep",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold tracking-wide transition-colors focus-visible:outline-3 focus-visible:outline-gold";

export function CtaLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={clsx(BASE, VARIANT_CLASSES[variant], className)}>
      {children}
    </Link>
  );
}

export function CtaButton({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={clsx(BASE, VARIANT_CLASSES[variant], className)} {...props}>
      {children}
    </button>
  );
}
