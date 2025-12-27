"use client";

import { ReactNode } from "react";
import styles from "./Section.module.css";

interface SectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Section({ children, className, title }: SectionProps) {
  return (
    <section className={`${styles.section} ${className || ""}`}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </section>
  );
}

