"use client";

import React from "react";
import styles from "./TheoryBuilder.module.css";
import { SUPPORTED_LEAGUES, type LeagueCode } from "@/lib/constants/sports";

interface Props {
  value: string;
  onChange: (league: string) => void;
}

export function LeagueSelector({ value, onChange }: Props) {
  return (
    <label className={styles.fieldLabel}>
      League
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {SUPPORTED_LEAGUES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </label>
  );
}

