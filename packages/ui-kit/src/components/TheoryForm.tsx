"use client";

import { useState, FormEvent } from "react";
import styles from "./TheoryForm.module.css";

export interface TheoryFormProps {
  domain: "bets" | "crypto" | "stocks" | "conspiracies";
  placeholder: string;
  examples: string[];
  onSubmit: (text: string, extraFields?: Record<string, any>) => Promise<any>;
  extraFields?: React.ReactNode;
  loading?: boolean;
}

export function TheoryForm({
  domain,
  placeholder,
  examples,
  onSubmit,
  extraFields,
  loading = false,
}: TheoryFormProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;

    setError(null);
    try {
      // Extract extra field values from form
      const formData = new FormData(e.currentTarget);
      const extraFieldsData: Record<string, any> = {};
      
      if (extraFields) {
        // Extract values from inputs/selects in extraFields
        const inputs = e.currentTarget.querySelectorAll("input, select");
        inputs.forEach((input) => {
          const element = input as HTMLInputElement | HTMLSelectElement;
          if (element.name && element.value) {
            extraFieldsData[element.name] = element.value;
          }
        });
      }
      
      await onSubmit(text, extraFieldsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label className={styles.label}>
        I have an idea...
        <textarea
          className={styles.textarea}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          required
          disabled={loading}
        />
      </label>

      {examples.length > 0 && (
        <div className={styles.examples}>
          <p className={styles.examplesLabel}>Examples:</p>
          <ul className={styles.examplesList}>
            {examples.map((example, idx) => (
              <li key={idx} className={styles.exampleItem}>{example}</li>
            ))}
          </ul>
        </div>
      )}

      {extraFields && <div className={styles.extraFields}>{extraFields}</div>}

      {error && <div className={styles.error}>{error}</div>}

      <button type="submit" className={styles.submitButton} disabled={loading || !text.trim()}>
        {loading ? "Evaluating..." : "Evaluate Theory"}
      </button>
    </form>
  );
}

