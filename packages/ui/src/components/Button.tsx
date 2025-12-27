import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  icon?: ReactNode;
};

export function Button({ className, children, variant = "primary", icon, ...props }: ButtonProps) {
  const classes = [
    "dock-btn",
    `dock-btn--${variant}`,
    icon ? "dock-btn--icon" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      {...props}
    >
      {icon ? <span className="dock-btn__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

