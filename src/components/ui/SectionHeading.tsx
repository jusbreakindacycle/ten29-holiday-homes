import { clsx } from "clsx";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  /** Use "h1" when this is the top-of-page heading (page has no other h1, e.g. no Hero). */
  as?: "h1" | "h2";
  className?: string;
}) {
  const Heading = as;
  return (
    <div className={clsx("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold mb-2">
          {eyebrow}
        </p>
      ) : null}
      <Heading className="text-3xl sm:text-4xl font-heading font-semibold text-forest leading-tight">
        {title}
      </Heading>
      {description ? <p className="mt-3 text-muted leading-relaxed">{description}</p> : null}
    </div>
  );
}
