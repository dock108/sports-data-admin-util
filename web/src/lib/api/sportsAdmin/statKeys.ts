import { request } from "./client";
import type { AvailableStatKeysResponse } from "./types";

export async function fetchStatKeys(leagueCode: string): Promise<AvailableStatKeysResponse> {
  return request(`/api/admin/sports/eda/stat-keys/${leagueCode}`);
}
