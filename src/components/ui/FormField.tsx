import type { ReactNode } from "react";
import { clsx } from "clsx";

export function FormField({
  label,
  htmlFor,
  error,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;

  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {" "}
            *
          </span>
        ) : (
          <span className="text-muted font-normal"> (optional)</span>
        )}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const INPUT_CLASSES =
  "w-full rounded-sm border border-border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus-visible:border-gold";
