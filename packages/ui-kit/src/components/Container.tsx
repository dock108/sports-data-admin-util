"use client";

import { ReactNode } from "react";
import styles from "./Container.module.css";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Container({ children, className, maxWidth = "lg" }: ContainerProps) {
  return (
    <div className={`${styles.container} ${styles[maxWidth]} ${className || ""}`}>
      {children}
    </div>
  );
}

