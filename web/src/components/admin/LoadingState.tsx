/**
 * Reusable loading state component.
 */

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div className={className}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div>{message}</div>
      </div>
    </div>
  );
}

