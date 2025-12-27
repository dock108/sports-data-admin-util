import { TheoryRunRequest, TheoryRunResult } from "../types/theoryRuns";

const API_BASE = process.env.NEXT_PUBLIC_THEORY_ENGINE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Request failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function createTheoryRun(payload: TheoryRunRequest): Promise<TheoryRunResult> {
  return request<TheoryRunResult>("/api/theory-runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTheoryRun(runId: string): Promise<TheoryRunResult> {
  return request<TheoryRunResult>(`/api/theory-runs/${runId}`);
}

