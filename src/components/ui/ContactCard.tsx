import type { ReactNode } from "react";

export function ContactCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col gap-3 rounded-sm border border-border bg-white p-6 transition-colors hover:border-gold"
    >
      <span aria-hidden="true" className="text-2xl text-gold">
        {icon}
      </span>
      <span className="font-heading text-xl text-forest group-hover:underline">{title}</span>
      <span className="text-sm text-muted">{description}</span>
    </a>
  );
}
