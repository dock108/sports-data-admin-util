"use client";

import React from "react";
import styles from "./TheoryBuilder.module.css";
import type { TimeWindow, TimeWindowMode } from "@/lib/api/theoryDraft";

interface Props {
  value: TimeWindow;
  onChange: (tw: TimeWindow) => void;
  league: string;
}

const MODE_LABELS: Record<TimeWindowMode, string> = {
  current_season: "This season",
  last_30: "Last 30 days",
  last_60: "Last 60 days",
  last_n: "Last N days",
  custom: "Custom range",
  specific_seasons: "Specific seasons",
};

export function TimeWindowSelector({ value, onChange, league }: Props) {
  const handleModeChange = (mode: TimeWindowMode) => {
    onChange({
      mode,
      value: mode === "last_n" ? 90 : null,
      start_date: null,
      end_date: null,
    });
  };

  return (
    <div className={styles.timeWindowSelector}>
      <label className={styles.fieldLabel}>
        Time window
        <select
          className={styles.select}
          value={value.mode}
          onChange={(e) => handleModeChange(e.target.value as TimeWindowMode)}
        >
          {Object.entries(MODE_LABELS).map(([mode, label]) => (
            <option key={mode} value={mode}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {value.mode === "last_n" && (
        <label className={styles.fieldLabel}>
          Days
          <input
            type="number"
            className={styles.input}
            min={1}
            max={365}
            value={typeof value.value === "number" ? value.value : 90}
            onChange={(e) =>
              onChange({ ...value, value: Number(e.target.value) || 90 })
            }
          />
        </label>
      )}

      {value.mode === "specific_seasons" && (
        <label className={styles.fieldLabel}>
          Seasons
          <input
            type="text"
            className={styles.input}
            placeholder="2023, 2024"
            value={
              Array.isArray(value.value) ? value.value.join(", ") : ""
            }
            onChange={(e) => {
              const seasons = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map(Number)
                .filter((n) => !isNaN(n));
              onChange({ ...value, value: seasons.length ? seasons : null });
            }}
          />
        </label>
      )}

      {value.mode === "custom" && (
        <div className={styles.dateRange}>
          <label className={styles.fieldLabel}>
            From
            <input
              type="date"
              className={styles.input}
              value={value.start_date?.split("T")[0] ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  start_date: e.target.value ? `${e.target.value}T00:00:00Z` : null,
                })
              }
            />
          </label>
          <label className={styles.fieldLabel}>
            To
            <input
              type="date"
              className={styles.input}
              value={value.end_date?.split("T")[0] ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  end_date: e.target.value ? `${e.target.value}T23:59:59Z` : null,
                })
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}

