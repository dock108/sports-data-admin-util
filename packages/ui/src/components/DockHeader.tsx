import type { HTMLAttributes } from "react";
import { Dock108Logo } from "./Dock108Logo";

type DockHeaderProps = HTMLAttributes<HTMLElement> & {
  ctaHref?: string | null;
  ctaLabel?: string;
};

export function DockHeader({ className, ctaHref, ctaLabel = "Back to hub", ...props }: DockHeaderProps) {
  const classes = ["dock-header", className ?? ""].filter(Boolean).join(" ");
  const CTA_HREF = "https://dock108.ai";
  const showCta = ctaHref !== null;
  const target = ctaHref ?? CTA_HREF;
  return (
    <header className={classes} {...props}>
      <a href="https://dock108.ai" className="dock-header__logo">
        <Dock108Logo />
      </a>
      {showCta && (
        <a href={target} className="dock-btn dock-btn--ghost">
          {ctaLabel}
        </a>
      )}
    </header>
  );
}

