"use client";

import { useState } from "react";
import { clsx } from "clsx";

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left font-heading text-lg text-forest"
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className={clsx("shrink-0 text-gold transition-transform", open && "rotate-45")}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="pb-5 text-muted leading-relaxed"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
