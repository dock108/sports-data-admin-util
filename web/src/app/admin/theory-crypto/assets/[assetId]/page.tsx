"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./page.module.css";
import {
  fetchCryptoAsset,
  listCryptoCandles,
  type CryptoAssetDetail,
  type CryptoCandleSummary,
} from "@/lib/api/cryptoAdmin";

export default function CryptoAssetDetailPage() {
  const params = useParams();
  const assetId = Number(params.assetId);

  const [asset, setAsset] = useState<CryptoAssetDetail | null>(null);
  const [candles, setCandles] = useState<CryptoCandleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [assetResp, candlesResp] = await Promise.all([
          fetchCryptoAsset(assetId),
          listCryptoCandles({ assetId, limit: 100 }),
        ]);
        setAsset(assetResp);
        setCandles(candlesResp.candles);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    if (assetId) {
      load();
    }
  }, [assetId]);

  if (loading) {
    return <div className={styles.loading}>Loading asset...</div>;
  }

  if (error || !asset) {
    return <div className={styles.error}>{error ?? "Asset not found"}</div>;
  }

  return (
    <div className={styles.container}>
      <Link href="/admin/theory-crypto/assets" className={styles.backLink}>
        ← Back to assets
      </Link>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h1>{asset.symbol}</h1>
          <div className={styles.metaList}>
            <div>
              <span className={styles.label}>Exchange</span>
              <p>{asset.exchange_code}</p>
            </div>
            <div>
              <span className={styles.label}>Base</span>
              <p>{asset.base ?? "—"}</p>
            </div>
            <div>
              <span className={styles.label}>Quote</span>
              <p>{asset.quote ?? "—"}</p>
            </div>
          </div>

          <div className={styles.metadataPre}>
            <span className={styles.label}>Metadata</span>
            <pre>{JSON.stringify(asset.metadata ?? {}, null, 2)}</pre>
          </div>
        </section>

        <section className={styles.card}>
          <h2>Recent Candles</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Timeframe</th>
                <th>Open</th>
                <th>High</th>
                <th>Low</th>
                <th>Close</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {candles.map((candle) => (
                <tr key={candle.id}>
                  <td>{new Date(candle.timestamp).toLocaleString()}</td>
                  <td>{candle.timeframe}</td>
                  <td>{candle.open}</td>
                  <td>{candle.high}</td>
                  <td>{candle.low}</td>
                  <td>{candle.close}</td>
                  <td>{candle.volume}</td>
                </tr>
              ))}
              {candles.length === 0 && (
                <tr>
                  <td colSpan={7}>No candles found for this asset.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}


