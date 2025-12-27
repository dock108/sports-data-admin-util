import type { HTMLAttributes } from "react";

export function Dock108Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const classes = ["dock-logo", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={classes} {...props}>
      <span className="dock-logo__dot" />
      <span className="dock-logo__word">DOCK108</span>
    </div>
  );
}

