"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./page.module.css";
import { getTheoryRun } from "@/lib/api/theoryRuns";
import { TheoryRunResult } from "@/lib/types/theoryRuns";

export default function TheoryRunResultPage() {
  const params = useParams();
  const runId = params?.run_id as string;
  const [data, setData] = useState<TheoryRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await getTheoryRun(runId);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    if (runId) load();
  }, [runId]);

  if (loading) return <div className={styles.status}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!data) return <div className={styles.status}>No data</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{data.sport} – Theory Result</h1>
        <p className={styles.subtitle}>{data.summary}</p>
      </header>

      <section className={styles.card}>
        <h3>Prompt feedback</h3>
        <ul>
          {data.prompt_feedback?.map((fb, idx) => (
            <li key={idx}>{fb}</li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        <h3>Historical Performance</h3>
        {data.bet_performance_by_type?.map((bp) => (
          <div key={bp.bet_type} className={styles.performanceBlock}>
            <h4>{bp.bet_type}</h4>
            <div className={styles.performanceRow}>
              <div>
                <span className={styles.label}>All (ROI)</span>
                <strong>{(bp.historical_all.roi * 100).toFixed(1)}%</strong>
              </div>
              <div>
                <span className={styles.label}>Theory subset (ROI)</span>
                <strong>{(bp.historical_theory_subset.roi * 100).toFixed(1)}%</strong>
              </div>
              <div>
                <span className={styles.label}>Last 30d (ROI)</span>
                <strong>{(bp.last_30_days.roi * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className={styles.card}>
        <h3>Upcoming Bets</h3>
        {data.upcoming_bets?.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Game</th>
                <th>Bet</th>
                <th>Rec</th>
                <th>Edge</th>
                <th>Fair</th>
                <th>Market</th>
                <th>P2P</th>
              </tr>
            </thead>
            <tbody>
              {data.upcoming_bets.map((ub, idx) => (
                <tr key={idx}>
                  <td>{ub.game_label}</td>
                  <td>{ub.bet_desc}</td>
                  <td>{ub.recommendation}</td>
                  <td>{(ub.edge * 100).toFixed(1)}%</td>
                  <td>{ub.fair_decimal_odds}</td>
                  <td>{ub.current_market_decimal_odds}</td>
                  <td>{ub.suggested_p2p_decimal_odds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.muted}>No upcoming bets</p>
        )}
      </section>

      <section className={styles.card}>
        <h3>Theory Details</h3>
        <p className={styles.muted}>{data.theory_text}</p>
        <h4>Model explanation</h4>
        <p>{data.model_explanation}</p>
      </section>
    </div>
  );
}

