"use client";

import styles from "./DomainHeader.module.css";

interface DomainHeaderProps {
  title: string;
  subtitle?: string;
  domain?: "bets" | "crypto" | "stocks" | "conspiracies" | "playlist" | "highlights";
}

export function DomainHeader({ title, subtitle, domain }: DomainHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  );
}

