"use client";

import React from "react";
import styles from "./TheoryBuilder.module.css";
import type { ContextPreset, ContextFeatures } from "@/lib/api/theoryDraft";
import {
  FEATURE_PLAYER_MODELING,
  FEATURE_CUSTOM_CONTEXT,
  FEATURE_DIAGNOSTICS,
} from "@/lib/featureFlags";

interface Props {
  preset: ContextPreset;
  features: ContextFeatures;
  onPresetChange: (preset: ContextPreset) => void;
  onFeaturesChange: (features: ContextFeatures) => void;
  diagnosticsAllowed: boolean;
  onDiagnosticsChange: (allowed: boolean) => void;
  hasPlayerFilter: boolean;
}

// All presets with visibility flags
const PRESET_LABELS: Record<ContextPreset, { label: string; description: string; flagged?: boolean }> = {
  minimal: {
    label: "Minimal",
    description: "Base stats only",
  },
  standard: {
    label: "Standard",
    description: "Adds pace + conference",
  },
  market_aware: {
    label: "Market aware",
    description: "Adds closing lines",
  },
  player_aware: {
    label: "Player aware",
    description: "Adds player minutes",
    flagged: true, // Only if FEATURE_PLAYER_MODELING
  },
  verbose: {
    label: "Verbose",
    description: "All available context",
    flagged: true, // Hide for MVP - too complex
  },
  custom: {
    label: "Custom",
    description: "Pick individual features",
    flagged: true, // Only if FEATURE_CUSTOM_CONTEXT
  },
};

// Feature groups for custom selection
const FEATURE_GROUPS: {
  key: keyof ContextFeatures;
  label: string;
  features: { name: string; label: string }[];
}[] = [
  {
    key: "game",
    label: "Game context",
    features: [
      { name: "is_conference_game", label: "Conference game" },
      { name: "pace_game", label: "Pace (possessions)" },
      { name: "pace_home_possessions", label: "Home possessions" },
      { name: "pace_away_possessions", label: "Away possessions" },
      { name: "home_rest_days", label: "Home rest days" },
      { name: "away_rest_days", label: "Away rest days" },
      { name: "rest_advantage", label: "Rest advantage" },
    ],
  },
  {
    key: "market",
    label: "Market context",
    features: [
      { name: "closing_spread_home", label: "Closing spread" },
      { name: "closing_total", label: "Closing total" },
      { name: "ml_implied_edge", label: "ML implied edge" },
    ],
  },
  {
    key: "team",
    label: "Team strength",
    features: [
      { name: "rating_diff", label: "Rating difference" },
      { name: "proj_points_diff", label: "Projected points diff" },
    ],
  },
  {
    key: "player",
    label: "Player context",
    features: [
      { name: "player_minutes", label: "Player minutes" },
      { name: "player_minutes_rolling", label: "Rolling minutes" },
      { name: "player_minutes_delta", label: "Minutes delta" },
    ],
  },
];

const DIAGNOSTIC_FEATURES = [
  { name: "final_total_points", label: "Final total points" },
  { name: "total_delta", label: "Total delta" },
  { name: "cover_margin", label: "Cover margin" },
];

export function ContextPresetSelector({
  preset,
  features,
  onPresetChange,
  onFeaturesChange,
  diagnosticsAllowed,
  onDiagnosticsChange,
  hasPlayerFilter,
}: Props) {
  // Filter presets by feature flags
  const visiblePresets = Object.entries(PRESET_LABELS).filter(([key, { flagged }]) => {
    if (!flagged) return true;
    if (key === "player_aware") return FEATURE_PLAYER_MODELING;
    if (key === "custom") return FEATURE_CUSTOM_CONTEXT;
    if (key === "verbose") return FEATURE_CUSTOM_CONTEXT; // Verbose is also advanced
    return false;
  });

  const toggleFeature = (group: keyof ContextFeatures, featureName: string) => {
    const current = features[group];
    const next = current.includes(featureName)
      ? current.filter((f) => f !== featureName)
      : [...current, featureName];
    onFeaturesChange({ ...features, [group]: next });
  };

  const toggleDiagnostic = (featureName: string) => {
    const current = features.diagnostic;
    const next = current.includes(featureName)
      ? current.filter((f) => f !== featureName)
      : [...current, featureName];
    onFeaturesChange({ ...features, diagnostic: next });
  };

  return (
    <div className={styles.contextSelector}>
      <div className={styles.presetSelect}>
        <label className={styles.fieldLabel}>
          Context
          <select
            className={styles.select}
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as ContextPreset)}
          >
            {visiblePresets.map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.presetDescription}>
          {PRESET_LABELS[preset].description}
        </p>
      </div>

      {/* Custom features - only if FEATURE_CUSTOM_CONTEXT enabled */}
      {preset === "custom" && FEATURE_CUSTOM_CONTEXT && (
        <div className={styles.customFeatures}>
          {FEATURE_GROUPS.map((group) => {
            // Only show player group if player feature flag AND player filter
            if (group.key === "player" && (!FEATURE_PLAYER_MODELING || !hasPlayerFilter)) {
              return null;
            }
            return (
              <div key={group.key} className={styles.featureGroup}>
                <h4 className={styles.featureGroupTitle}>{group.label}</h4>
                <div className={styles.featureCheckboxes}>
                  {group.features.map((f) => (
                    <label key={f.name} className={styles.featureCheckbox}>
                      <input
                        type="checkbox"
                        checked={features[group.key].includes(f.name)}
                        onChange={() => toggleFeature(group.key, f.name)}
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Diagnostics section - only if FEATURE_DIAGNOSTICS enabled */}
      {FEATURE_DIAGNOSTICS && (
        <div className={styles.diagnosticsSection}>
          <label className={styles.diagnosticsToggle}>
            <input
              type="checkbox"
              checked={diagnosticsAllowed}
              onChange={(e) => onDiagnosticsChange(e.target.checked)}
            />
            <span className={styles.diagnosticsLabel}>
              Enable post-game diagnostics
            </span>
            <span className={styles.diagnosticsWarning}>⚠️ Leaky features</span>
          </label>

          {diagnosticsAllowed && (
            <div className={styles.diagnosticFeatures}>
              <p className={styles.diagnosticsNote}>
                These features use post-game data and cannot be used for pre-game predictions.
              </p>
              <div className={styles.featureCheckboxes}>
                {DIAGNOSTIC_FEATURES.map((f) => (
                  <label key={f.name} className={styles.featureCheckbox}>
                    <input
                      type="checkbox"
                      checked={features.diagnostic.includes(f.name)}
                      onChange={() => toggleDiagnostic(f.name)}
                    />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

