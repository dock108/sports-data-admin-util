"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./page.module.css";
import { fetchCryptoIngestionRun, type CryptoIngestionRunResponse } from "@/lib/api/cryptoAdmin";

export default function CryptoRunDetailPage() {
  const params = useParams();
  const runId = Number(params.runId);

  const [run, setRun] = useState<CryptoIngestionRunResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchCryptoIngestionRun(runId);
        setRun(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    if (runId) {
      load();
    }
  }, [runId]);

  if (loading) {
    return <div className={styles.loading}>Loading crypto run details...</div>;
  }

  if (error || !run) {
    return <div className={styles.error}>{error ?? "Run not found"}</div>;
  }

  return (
    <div className={styles.container}>
      <Link href="/admin/theory-crypto/ingestion" className={styles.backLink}>
        ← Back to runs
      </Link>

      <section className={styles.card}>
        <h1>Run #{run.id}</h1>
        <div className={styles.metaGrid}>
          <div>
            <span className={styles.label}>Exchange</span>
            <p>{run.exchange_code}</p>
          </div>
          <div>
            <span className={styles.label}>Status</span>
            <p className={styles.status}>{run.status}</p>
          </div>
          <div>
            <span className={styles.label}>Timeframe</span>
            <p>{run.timeframe}</p>
          </div>
          <div>
            <span className={styles.label}>Symbols</span>
            <p>{run.symbols.join(", ") || "—"}</p>
          </div>
          <div>
            <span className={styles.label}>Requested by</span>
            <p>{run.requested_by ?? "—"}</p>
          </div>
          <div>
            <span className={styles.label}>Created</span>
            <p>{new Date(run.created_at).toLocaleString()}</p>
          </div>
          <div>
            <span className={styles.label}>Finished</span>
            <p>{run.finished_at ? new Date(run.finished_at).toLocaleString() : "—"}</p>
          </div>
        </div>

        <div className={styles.configBlock}>
          <h2>Config</h2>
          <pre>{JSON.stringify(run.config ?? {}, null, 2)}</pre>
        </div>
        {run.summary && (
          <div className={styles.summary}>
            <h2>Summary</h2>
            <p>{run.summary}</p>
          </div>
        )}
      </section>
    </div>
  );
}


