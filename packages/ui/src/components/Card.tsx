import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  actions?: ReactNode;
};

export function Card({ className, children, title, actions, ...props }: CardProps) {
  const classes = ["dock-card", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={classes} {...props}>
      {(title || actions) && (
        <header className="dock-card__header">
          {title && <h3>{title}</h3>}
          {actions}
        </header>
      )}
      {children}
    </div>
  );
}

