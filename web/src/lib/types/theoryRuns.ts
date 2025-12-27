export type TheoryRunRequest = {
  sport: string;
  theory_text: string;
  user_stats?: string[];
  user_bet_types?: string[];
};

export type BetPerformanceSlice = {
  n_bets: number;
  record: { wins: number; losses: number; pushes: number };
  pnl_units: number;
  roi: number;
};

export type BetPerformance = {
  bet_type: string;
  historical_all: BetPerformanceSlice;
  historical_theory_subset: BetPerformanceSlice;
  last_30_days: BetPerformanceSlice;
};

export type UpcomingBet = {
  game_id: string;
  game_label: string;
  event_date: string;
  bet_type: string;
  bet_desc: string;
  model_win_prob: number;
  implied_prob: number;
  edge: number;
  kelly_fraction: number;
  recommendation: "strong" | "lean" | "no_bet";
  fair_decimal_odds: number;
  current_market_decimal_odds: number;
  suggested_p2p_decimal_odds: number;
  mm_ev_after_fees: number;
  p2p_fee_rate: number;
  explanation_snippet: string;
};

export type TheoryRunResult = {
  run_id: string;
  sport: string;
  theory_text: string;
  summary: string;
  prompt_feedback: string[];
  bet_performance_by_type: BetPerformance[];
  upcoming_bets: UpcomingBet[];
  stat_drivers: { name: string; importance_score: number }[];
  model_explanation: string;
  meta: { created_at: string; version: string };
};

