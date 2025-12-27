"use client";

import React, { useState, useCallback, useMemo } from "react";
import styles from "./TheoryBuilder.module.css";
import type { TheoryBuilderState, TheoryBuilderActions } from "./useTheoryBuilderState";

interface Props {
  state: TheoryBuilderState;
  actions: TheoryBuilderActions;
}

// Human-readable target descriptions
const TARGET_DESCRIPTIONS: Record<string, string> = {
  game_total: "Totals (O/U)",
  spread_result: "Spread (ATS)",
  moneyline_win: "Moneyline",
  team_stat: "Team stat",
};

// Context preset labels
const CONTEXT_LABELS: Record<string, string> = {
  minimal: "Base stats only",
  standard: "Standard (pace, conference)",
  market_aware: "Market-aware (lines, implied)",
  verbose: "Verbose (all context)",
  custom: "Custom",
};

export function ResultsPanel({ state, actions }: Props) {
  const { analysisResult, draft } = state;
  const [showCorrelations, setShowCorrelations] = useState(false);
  const [showAllGames, setShowAllGames] = useState(false);

  const downloadJson = useCallback((filename: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }, []);

  // Build cohort rule description from draft
  const getCohortRuleDescription = (): string => {
    const rule = draft.cohort_rule;
    if (rule.mode === "auto") {
      return "Auto-discovered (best split using selected stats)";
    }
    if (rule.mode === "quantile" && rule.quantile_rules && rule.quantile_rules.length > 0) {
      return rule.quantile_rules
        .map((qr) => `${qr.stat} in ${qr.direction} ${qr.percentile}%`)
        .join(" AND ");
    }
    if (rule.mode === "threshold" && rule.threshold_rules && rule.threshold_rules.length > 0) {
      return rule.threshold_rules
        .map((tr) => `${tr.stat} ${tr.operator} ${tr.value}`)
        .join(" AND ");
    }
    return "No rule defined";
  };

  // Build verdict reasons from single source of truth
  const verdictReasons = useMemo(() => {
    if (!analysisResult) return [];
    const reasons: { type: "good" | "warning" | "bad"; text: string }[] = [];
    
    // Use the exact values from response - NO recomputation
    const { sample_size, baseline_value, cohort_value, delta_value } = analysisResult;
    
    // Sanity check: delta should equal cohort - baseline
    const expectedDelta = cohort_value - baseline_value;
    const deltaMatch = Math.abs(delta_value - expectedDelta) < 0.001;
    if (!deltaMatch) {
      console.warn("Delta mismatch:", { delta_value, expectedDelta, cohort_value, baseline_value });
    }

    // Lift assessment
    if (delta_value > 0.05) {
      reasons.push({ type: "good", text: `Meaningful lift (+${(delta_value * 100).toFixed(1)}%)` });
    } else if (delta_value > 0) {
      reasons.push({ type: "warning", text: `Small lift (+${(delta_value * 100).toFixed(1)}%)` });
    } else {
      reasons.push({ type: "bad", text: `No lift (${(delta_value * 100).toFixed(1)}%)` });
    }

    // Sample size assessment
    if (sample_size >= 500) {
      reasons.push({ type: "good", text: `Good sample (${sample_size.toLocaleString()} games)` });
    } else if (sample_size >= 100) {
      reasons.push({ type: "warning", text: `Small sample (${sample_size.toLocaleString()} games)` });
    } else {
      reasons.push({ type: "bad", text: `Very small sample (${sample_size.toLocaleString()} games)` });
    }

    return reasons;
  }, [analysisResult]);

  if (!analysisResult) {
    return (
      <div className={styles.resultsPanel}>
        <div className={styles.emptyResults}>
          <h3>No results yet</h3>
          <p>Define your theory and run analysis to see results here.</p>
        </div>
      </div>
    );
  }

  // Extract values - single source of truth
  const { sample_size, baseline_value, cohort_value, delta_value } = analysisResult;
  const correlations = analysisResult.correlations ?? [];
  const sampleGames = analysisResult.sample_games ?? [];
  
  // Target description
  const targetDesc = TARGET_DESCRIPTIONS[draft.target.type] ?? draft.target.type;
  const sideDesc = draft.target.side ? ` (${draft.target.side})` : "";

  // Only show patterns if:
  // 1. Rule mode is auto (we discovered something), OR
  // 2. Context is NOT minimal (we added features beyond base stats)
  const showPatterns = 
    (draft.cohort_rule.mode === "auto" || draft.context.preset !== "minimal") &&
    analysisResult.detected_concepts.length > 0;

  // Display limits
  const displayCorrelations = showCorrelations ? correlations : correlations.slice(0, 3);
  const displayGames = showAllGames ? sampleGames : sampleGames.slice(0, 10);

  return (
    <div className={styles.resultsPanel}>
      {/* COHORT DEFINITION - Must be shown first */}
      <div className={styles.cohortDefinition}>
        <h4 className={styles.cohortTitle}>Cohort Definition</h4>
        
        {/* If backend provided cohort_definition, use it */}
        {analysisResult.cohort_definition ? (
          <div className={styles.cohortDetails}>
            <p className={styles.cohortRule}>
              <strong>Rule:</strong> {analysisResult.cohort_definition.rule_description}
            </p>
            {analysisResult.cohort_definition.discovered_split && (
              <p className={styles.cohortDiscovered}>
                <strong>Discovered:</strong> {analysisResult.cohort_definition.discovered_split}
              </p>
            )}
          </div>
        ) : (
          /* Fallback: build from draft */
          <p className={styles.cohortRule}>
            <strong>Rule:</strong> {getCohortRuleDescription()}
          </p>
        )}
        
        <p className={styles.cohortMeta}>
          <strong>Market:</strong> {targetDesc}{sideDesc} &nbsp;|&nbsp;
          <strong>Context:</strong> {CONTEXT_LABELS[draft.context.preset] ?? draft.context.preset} &nbsp;|&nbsp;
          <strong>Window:</strong> {draft.time_window.mode.replace(/_/g, " ")}
        </p>
      </div>

      {/* METRICS - Single source of truth, no recomputation */}
      <div className={styles.metricsSection}>
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Sample</span>
            <span className={styles.summaryValue}>{sample_size.toLocaleString()}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Baseline</span>
            <span className={styles.summaryValue}>{(baseline_value * 100).toFixed(1)}%</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Cohort</span>
            <span className={styles.summaryValue}>{(cohort_value * 100).toFixed(1)}%</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Lift</span>
            <span className={`${styles.summaryValue} ${delta_value > 0 ? styles.positive : styles.negative}`}>
              {delta_value > 0 ? "+" : ""}{(delta_value * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* SUMMARY SENTENCE - Uses exact values from metrics */}
      <p className={styles.summarySentence}>
        Games in this cohort{" "}
        {draft.target.type === "spread_result"
          ? `covered the spread ${(cohort_value * 100).toFixed(1)}% of the time`
          : draft.target.type === "moneyline_win"
            ? `won ${(cohort_value * 100).toFixed(1)}% of the time`
            : draft.target.type === "game_total"
              ? `went over ${(cohort_value * 100).toFixed(1)}% of the time`
              : `averaged ${cohort_value.toFixed(2)}`}
        , compared to {(baseline_value * 100).toFixed(1)}% baseline
        {delta_value > 0 
          ? ` — a +${(delta_value * 100).toFixed(1)}% lift`
          : ` — a ${(delta_value * 100).toFixed(1)}% difference`}.
      </p>

      {/* ASSESSMENT */}
      {verdictReasons.length > 0 && (
        <div className={styles.verdictSection}>
          <h4 className={styles.subsectionTitle}>Assessment</h4>
          <ul className={styles.verdictList}>
            {verdictReasons.map((reason, i) => (
              <li key={i} className={styles[`verdict${reason.type}`]}>
                <span className={styles.verdictIcon}>
                  {reason.type === "good" ? "✓" : reason.type === "warning" ? "⚠" : "✗"}
                </span>
                {reason.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* DETECTED PATTERNS - Only if appropriate */}
      {showPatterns && (
        <div className={styles.conceptsSection}>
          <h4 className={styles.subsectionTitle}>
            Detected patterns
            {draft.cohort_rule.mode === "auto" && (
              <span className={styles.patternSource}> (from auto-discovery)</span>
            )}
          </h4>
          <ul className={styles.patternList}>
            {analysisResult.detected_concepts.map((concept) => (
              <li key={concept} className={styles.patternItem}>{concept}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CORRELATIONS - Collapsed, diagnostic only */}
      {correlations.length > 0 && (
        <details className={styles.correlationsSection}>
          <summary className={styles.correlationsSummary}>
            Feature correlations (diagnostic)
            <span className={styles.correlationsHint}>
              For intuition only — correlation ≠ causation
            </span>
          </summary>
          <div className={styles.correlationsContent}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Correlation</th>
                </tr>
              </thead>
              <tbody>
                {displayCorrelations.map((c) => (
                  <tr key={c.feature}>
                    <td>{c.feature.replace(/_/g, " ")}</td>
                    <td className={c.correlation > 0 ? styles.positive : styles.negative}>
                      {c.correlation.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {correlations.length > 3 && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setShowCorrelations(!showCorrelations)}
              >
                {showCorrelations ? "Show top 3" : `Show all ${correlations.length}`}
              </button>
            )}
          </div>
        </details>
      )}

      {/* SAMPLE GAMES - With full data or clear message */}
      <div className={styles.sampleGamesSection}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.subsectionTitle}>Sample games</h4>
          {sampleGames.length > 0 && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => downloadJson("sample_games.json", sampleGames)}
            >
              Export
            </button>
          )}
        </div>
        
        {sampleGames.length > 0 ? (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Home</th>
                    <th>Score</th>
                    <th>Away</th>
                    <th>Score</th>
                    <th>{targetDesc}</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {displayGames.map((game, i) => (
                    <tr key={game.game_id || i}>
                      <td>{game.game_date}</td>
                      <td>{game.home_team}</td>
                      <td>{game.home_score}</td>
                      <td>{game.away_team}</td>
                      <td>{game.away_score}</td>
                      <td>{typeof game.target_value === "number" 
                        ? game.target_value.toFixed(1) 
                        : game.target_value}</td>
                      <td className={["W", "Cover", "O"].includes(game.outcome) 
                        ? styles.positive 
                        : styles.negative}>
                        {game.outcome}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sampleGames.length > 10 && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setShowAllGames(!showAllGames)}
              >
                {showAllGames ? "Show fewer" : `Show all ${sampleGames.length.toLocaleString()}`}
              </button>
            )}
          </>
        ) : (
          <p className={styles.noDataMessage}>
            Sample games unavailable (missing game metadata join in backend).
          </p>
        )}
      </div>

      {/* EXPORT */}
      <div className={styles.exportSection}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => downloadJson("theory_analysis.json", analysisResult)}
        >
          Download Full Analysis
        </button>
      </div>
    </div>
  );
}
