/**
 * Reusable status badge component for scrape runs and other status indicators.
 */

import { getStatusColor, getStatusLabel } from "@/lib/utils/status";
import styles from "./StatusBadge.module.css";

interface StatusBadgeProps {
  status: string;
  className?: string;
  useInlineStyle?: boolean;
}

/**
 * Status badge component that displays a colored badge for a status.
 * 
 * @param status - Status string (success, pending, running, error, interrupted)
 * @param className - Optional additional CSS class
 * @param useInlineStyle - If true, uses inline backgroundColor style instead of CSS class
 */
export function StatusBadge({ status, className = "", useInlineStyle = false }: StatusBadgeProps) {
  const label = getStatusLabel(status);
  const color = getStatusColor(status);

  if (useInlineStyle) {
    return (
      <span className={`${styles.badge} ${className}`} style={{ backgroundColor: color }}>
        {label}
      </span>
    );
  }

  // Use CSS class-based styling (requires CSS module with status classes)
  const statusClass = `status${status.charAt(0).toUpperCase() + status.slice(1)}`;
  return (
    <span className={`${styles.badge} ${styles[statusClass]} ${className}`}>
      {label}
    </span>
  );
}

