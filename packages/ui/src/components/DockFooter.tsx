import type { HTMLAttributes } from "react";

export function DockFooter({ className, ...props }: HTMLAttributes<HTMLElement>) {
  const classes = ["dock-footer", className ?? ""].filter(Boolean).join(" ");
  return (
    <footer className={classes} {...props}>
      © {new Date().getFullYear()} dock108.ai — labs & experiments
    </footer>
  );
}

