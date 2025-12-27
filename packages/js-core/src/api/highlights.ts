/**
 * Highlights API methods for sports highlight playlists.
 */

import { APIClient } from "./client";

export type PlaylistMode = "sports_highlight" | "general_playlist";

export interface HighlightPlanRequest {
  query_text: string;
  mode?: PlaylistMode;
  user_id?: string | null;
  // Structured builder fields (optional)
  sports?: string[];
  teams?: string[];
  players?: string[];
  play_types?: string[];
  date_preset?: string;
  custom_start_date?: string;
  custom_end_date?: string;
  duration_minutes?: number;
  comments?: string;
}

export interface PlaylistItem {
  video_id: string;
  title: string;
  channel_title: string;
  duration_seconds: number;
  url: string;
  thumbnail_url?: string;
  scores: {
    final_score: number;
    highlight_score: number;
    channel_reputation: number;
    view_count_normalized: number;
    freshness_score: number;
  };
}

export interface HighlightPlanResponse {
  playlist_id: number;
  query_id: number;
  items: PlaylistItem[];
  cache_status: "cached" | "fresh";
  total_duration_seconds: number;
  disclaimer: string;
  explanation?: {
    assumptions: string[];
    filters_applied: {
      content_types: string[];
      exclusions: string[];
      nsfw_filter: boolean;
    };
    ranking_factors: {
      highlight_score_weight: number;
      channel_reputation_weight: number;
      view_count_weight: number;
      freshness_weight: number;
    };
    coverage_notes: string[];
    total_candidates: number;
    selected_videos: number;
    actual_duration_minutes: number;
    target_duration_minutes: number;
  };
  created_at?: string;
  stale_after?: string | null;
}

export interface HighlightDetailResponse extends HighlightPlanResponse {
  query_text: string;
  explanation: {
    assumptions: string[];
    filters_applied: {
      content_types: string[];
      exclusions: string[];
      nsfw_filter: boolean;
    };
    ranking_factors: {
      highlight_score_weight: number;
      channel_reputation_weight: number;
      view_count_weight: number;
      freshness_weight: number;
    };
    coverage_notes: string[];
    total_candidates: number;
    selected_videos: number;
    actual_duration_minutes: number;
    target_duration_minutes: number;
  };
  query_metadata?: {
    sport?: string | null;
    league?: string | null;
    teams?: string[] | null;
    event_date?: string | null;
    is_playoff?: boolean | null;
  };
}

export interface HighlightMetrics {
  sports_requested: Record<string, number>;
  average_playlist_duration_minutes: number;
  cache_hit_rate: number;
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
}

export interface WatchTokenResponse {
  token: string;
  watch_url: string;
  expires_at: string;
}

export class HighlightsAPI {
  constructor(private client: APIClient) {}

  /**
   * Plan a highlight playlist from user query.
   */
  async planPlaylist(
    request: HighlightPlanRequest
  ): Promise<HighlightPlanResponse> {
    return this.client.post<HighlightPlanResponse>(
      "/api/highlights/plan",
      request
    );
  }

  /**
   * Get detailed playlist information.
   */
  async getPlaylist(playlistId: number): Promise<HighlightDetailResponse> {
    return this.client.get<HighlightDetailResponse>(
      `/api/highlights/${playlistId}`
    );
  }

  /**
   * Get metrics (sports requested, avg duration, cache hit rate).
   */
  async getMetrics(days: number = 30): Promise<HighlightMetrics> {
    return this.client.get<HighlightMetrics>(
      `/api/highlights/metrics?days=${days}`
    );
  }

  /**
   * Get metrics as CSV.
   */
  async getMetricsCSV(days: number = 30): Promise<string> {
    return this.client.get<string>(`/api/highlights/metrics/csv?days=${days}`);
  }

  /**
   * Generate a watch token for a playlist.
   */
  async getWatchToken(playlistId: number): Promise<WatchTokenResponse> {
    return this.client.post<WatchTokenResponse>(
      `/api/highlights/${playlistId}/watch-token`,
      {}
    );
  }

  /**
   * Get playlist data using a watch token.
   */
  async getPlaylistByToken(token: string): Promise<HighlightDetailResponse> {
    return this.client.get<HighlightDetailResponse>(
      `/api/highlights/watch/${token}`
    );
  }
}

