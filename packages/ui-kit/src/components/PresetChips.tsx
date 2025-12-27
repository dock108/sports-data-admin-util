"use client";

import styles from "./PresetChips.module.css";

export interface Preset {
  text: string;
  value: string;
  description?: string;
}

interface PresetChipsProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  selected?: string;
}

export function PresetChips({ presets, onSelect, selected }: PresetChipsProps) {
  return (
    <div className={styles.container}>
      {presets.map((preset) => (
        <button
          key={preset.value}
          className={`${styles.chip} ${selected === preset.value ? styles.selected : ""}`}
          onClick={() => onSelect(preset)}
          type="button"
        >
          {preset.text}
        </button>
      ))}
    </div>
  );
}

