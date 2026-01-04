import { request } from "./client";
import type { ScrapeRunResponse } from "./types";

export type ScrapeRunCreatePayload = {
  requestedBy?: string;
  config: {
    leagueCode: string;
    season?: number;
    seasonType?: string;
    startDate?: string;
    endDate?: string;
    // Data type toggles
    boxscores?: boolean;
    odds?: boolean;
    social?: boolean;
    pbp?: boolean;
    // Shared filters
    onlyMissing?: boolean;
    updatedBefore?: string;
    books?: string[];
  };
};

export async function createScrapeRun(payload: ScrapeRunCreatePayload): Promise<ScrapeRunResponse> {
  return request("/api/admin/sports/scraper/runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listScrapeRuns(params?: { league?: string; status?: string }): Promise<ScrapeRunResponse[]> {
  const query = new URLSearchParams();
  if (params?.league) query.append("league", params.league);
  if (params?.status) query.append("status", params.status);
  const qs = query.toString();
  return request(`/api/admin/sports/scraper/runs${qs ? `?${qs}` : ""}`);
}

export async function fetchScrapeRun(runId: number): Promise<ScrapeRunResponse> {
  return request(`/api/admin/sports/scraper/runs/${runId}`);
}

export async function cancelScrapeRun(runId: number): Promise<ScrapeRunResponse> {
  return request(`/api/admin/sports/scraper/runs/${runId}/cancel`, {
    method: "POST",
  });
}
