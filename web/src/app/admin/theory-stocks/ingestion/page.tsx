"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import {
  createStocksIngestionRun,
  listStocksIngestionRuns,
  type StocksIngestionRunResponse,
} from "@/lib/api/stocksAdmin";
import { formatDateTime } from "@/lib/utils/dateFormat";
import { StatusBadge } from "@/components/admin/StatusBadge";

const EXCHANGES = ["NYSE", "NASDAQ"];
const TIMEFRAMES = ["1d", "1h"];

interface IngestionFormState {
  exchangeCode: string;
  tickers: string;
  timeframe: string;
  start: string;
  end: string;
  includeCandles: boolean;
  backfillMissingCandles: boolean;
  requestedBy: string;
}

const DEFAULT_FORM: IngestionFormState = {
  exchangeCode: "NYSE",
  tickers: "",
  timeframe: "1d",
  start: "",
  end: "",
  includeCandles: true,
  backfillMissingCandles: false,
  requestedBy: "",
};

export default function StocksIngestionAdminPage() {
  const [runs, setRuns] = useState<StocksIngestionRunResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<IngestionFormState>(DEFAULT_FORM);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await listStocksIngestionRuns({ limit: 50 });
      setRuns(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const tickersArray = form.tickers
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const result = await createStocksIngestionRun({
        requestedBy: form.requestedBy || undefined,
        config: {
          exchangeCode: form.exchangeCode,
          tickers: tickersArray,
          timeframe: form.timeframe,
          start: form.start || undefined,
          end: form.end || undefined,
          includeCandles: form.includeCandles,
          backfillMissingCandles: form.backfillMissingCandles,
        },
      });

      setSuccess(`Ingestion run #${result.id} scheduled successfully!`);
      setForm(DEFAULT_FORM);
      fetchRuns();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const latestRuns = useMemo(() => runs.slice(0, 25), [runs]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Stocks Ingestion Runs</h1>
        <p className={styles.subtitle}>Configure and monitor stocks ingestion jobs</p>
      </header>

      <section className={styles.card}>
        <h2>Create Ingestion Run</h2>
        {success && <p className={styles.success}>{success}</p>}
        {error && <p className={styles.error}>{error}</p>}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Exchange
            <select
              value={form.exchangeCode}
              onChange={(e) => setForm((prev) => ({ ...prev, exchangeCode: e.target.value }))}
            >
              {EXCHANGES.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tickers (comma-separated)
            <input
              type="text"
              placeholder="AAPL, MSFT"
              value={form.tickers}
              onChange={(e) => setForm((prev) => ({ ...prev, tickers: e.target.value }))}
            />
          </label>

          <div className={styles.row}>
            <label>
              Timeframe
              <select
                value={form.timeframe}
                onChange={(e) => setForm((prev) => ({ ...prev, timeframe: e.target.value }))}
              >
                {TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Requested by
              <input
                type="text"
                placeholder="admin@dock108"
                value={form.requestedBy}
                onChange={(e) => setForm((prev) => ({ ...prev, requestedBy: e.target.value }))}
              />
            </label>
          </div>

          <div className={styles.row}>
            <label>
              Start (UTC)
              <input
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm((prev) => ({ ...prev, start: e.target.value }))}
              />
            </label>
            <label>
              End (UTC)
              <input
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm((prev) => ({ ...prev, end: e.target.value }))}
              />
            </label>
          </div>

          <div className={styles.toggles}>
            <label>
              <input
                type="checkbox"
                checked={form.includeCandles}
                onChange={(e) => setForm((prev) => ({ ...prev, includeCandles: e.target.checked }))}
              />
              Include candles
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.backfillMissingCandles}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, backfillMissingCandles: e.target.checked }))
                }
              />
              Backfill missing candles
            </label>
          </div>

          <button type="submit" disabled={creating}>
            {creating ? "Scheduling..." : "Schedule Run"}
          </button>
        </form>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Recent Runs</h2>
          <button onClick={fetchRuns} disabled={loading}>
            Refresh
          </button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Exchange</th>
              <th>Timeframe</th>
              <th>Status</th>
              <th>Tickers</th>
              <th>Date range</th>
              <th>Summary</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {latestRuns.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link href={`/admin/theory-stocks/ingestion/${run.id}`}>{run.id}</Link>
                </td>
                <td>{run.exchange_code}</td>
                <td>{run.timeframe}</td>
                <td>
                  <StatusBadge status={run.status} />
                </td>
                <td>{run.tickers.join(", ") || "—"}</td>
                <td>
                  {run.start_time || run.end_time
                    ? `${run.start_time ?? "?"} to ${run.end_time ?? "?"}`
                    : "—"}
                </td>
                <td>{run.summary ?? "—"}</td>
                <td>{formatDateTime(run.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}


