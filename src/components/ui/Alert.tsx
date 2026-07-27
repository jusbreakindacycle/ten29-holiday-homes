import { clsx } from "clsx";

type Tone = "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  info: "bg-sand border-border text-ink",
  success: "bg-white border-success text-success",
  warning: "bg-white border-warning text-warning",
  danger: "bg-white border-danger text-danger",
};

const TONE_ICON: Record<Tone, string> = {
  info: "ℹ",
  success: "✓",
  warning: "!",
  danger: "✕",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx("rounded-sm border px-4 py-3 text-sm leading-relaxed", TONE_CLASSES[tone], className)}
    >
      <p className="font-semibold flex items-center gap-2">
        <span aria-hidden="true">{TONE_ICON[tone]}</span>
        {title}
      </p>
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}
