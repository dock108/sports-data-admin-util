"use client";

import styles from "./ErrorDisplay.module.css";

interface ErrorDisplayProps {
  error: Error | string;
  title?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, title = "Error", onRetry }: ErrorDisplayProps) {
  const errorMessage = typeof error === "string" ? error : error.message;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{errorMessage}</p>
      {onRetry && (
        <button className={styles.retryButton} onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

