/**
 * Shared hook for fetching scrape runs.
 */

import { useEffect, useState } from "react";
import { listScrapeRuns, type ScrapeRunResponse } from "@/lib/api/sportsAdmin";

interface UseScrapeRunsOptions {
  autoFetch?: boolean;
  league?: string;
  status?: string;
}

export function useScrapeRuns(options: UseScrapeRunsOptions = {}) {
  const { autoFetch = true, league, status } = options;
  const [runs, setRuns] = useState<ScrapeRunResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listScrapeRuns({ league, status });
      setRuns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchRuns();
    }
  }, [autoFetch, league, status]);

  return {
    runs,
    loading,
    error,
    refetch: fetchRuns,
  };
}

