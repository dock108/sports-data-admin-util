/**
 * Reusable error state component.
 */

interface ErrorStateProps {
  error: string | Error;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  error,
  title = "Error",
  onRetry,
  className = "",
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <div className={className} style={{ padding: "1rem", color: "#ef4444" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>{title}</h3>
      <p style={{ marginBottom: onRetry ? "1rem" : "0" }}>{errorMessage}</p>
      {onRetry && (
        <button onClick={onRetry} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
          Retry
        </button>
      )}
    </div>
  );
}

