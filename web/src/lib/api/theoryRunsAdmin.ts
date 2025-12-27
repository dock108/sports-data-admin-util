export type TheoryRunListItem = {
  id: number;
  sport: string;
  theory_text: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export type TheoryRunsListResponse = {
  runs: TheoryRunListItem[];
  total: number;
  next_offset: number | null;
};

export type TheoryRunAdminResponse = {
  id: number;
  sport: string;
  theory_text: string;
  status: string;
  run_config: Record<string, any>;
  results: Record<string, any>;
  created_at: string;
  completed_at: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_THEORY_ENGINE_URL || "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Request failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function listTheoryRuns(params: { sport?: string; status?: string; limit?: number; offset?: number }) {
  const url = new URL(`${API_BASE}/api/admin/theory-runs`);
  if (params.sport) url.searchParams.set("sport", params.sport);
  if (params.status) url.searchParams.set("status", params.status);
  url.searchParams.set("limit", String(params.limit ?? 50));
  url.searchParams.set("offset", String(params.offset ?? 0));
  return request<TheoryRunsListResponse>(url.toString());
}

export async function getTheoryRunAdmin(runId: number) {
  return request<TheoryRunAdminResponse>(`/api/admin/theory-runs/${runId}`);
}

