"use client";

import { ReactNode } from "react";
import styles from "./PageLayout.module.css";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={`${styles.layout} ${className || ""}`}>
      {children}
    </div>
  );
}

