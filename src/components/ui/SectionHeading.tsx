import { clsx } from "clsx";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={clsx("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold mb-2">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-forest">{title}</h2>
      {description ? <p className="mt-3 text-muted leading-relaxed">{description}</p> : null}
    </div>
  );
}
