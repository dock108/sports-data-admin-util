"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import {
  listCryptoAssets,
  type CryptoAssetSummary,
  type CryptoAssetListResponse,
} from "@/lib/api/cryptoAdmin";

const EXCHANGES = ["", "BINANCE", "COINBASE", "BYBIT"];

export default function CryptoAssetsPage() {
  const [assetsResponse, setAssetsResponse] = useState<CryptoAssetListResponse | null>(null);
  const [exchange, setExchange] = useState<string>("");
  const [symbolPrefix, setSymbolPrefix] = useState<string>("");
  const [base, setBase] = useState<string>("");
  const [quote, setQuote] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssets = async (newOffset = 0) => {
    try {
      setLoading(true);
      const data = await listCryptoAssets({
        exchange: exchange || undefined,
        symbolPrefix: symbolPrefix || undefined,
        base: base || undefined,
        quote: quote || undefined,
        limit,
        offset: newOffset,
      });
      setAssetsResponse(data);
      setOffset(newOffset);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    loadAssets(0);
  };

  const handleReset = () => {
    setExchange("");
    setSymbolPrefix("");
    setBase("");
    setQuote("");
    loadAssets(0);
  };

  const pageCount =
    assetsResponse && assetsResponse.total > 0
      ? Math.ceil(assetsResponse.total / limit)
      : 1;
  const currentPage = Math.floor(offset / limit) + 1;

  const items: CryptoAssetSummary[] = assetsResponse?.assets ?? [];

  if (loading && !assetsResponse && !error) {
    return <div className={styles.loading}>Loading assets...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Crypto Assets</h1>
        <p className={styles.subtitle}>Browse tracked exchanges and trading pairs</p>
      </header>

      <div className={styles.filters}>
        <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
          {EXCHANGES.map((ex) => (
            <option key={ex || "all"} value={ex}>
              {ex || "All exchanges"}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Symbol prefix (e.g. BTC)"
          value={symbolPrefix}
          onChange={(e) => setSymbolPrefix(e.target.value)}
        />
        <input
          type="text"
          placeholder="Base (e.g. BTC)"
          value={base}
          onChange={(e) => setBase(e.target.value)}
        />
        <input
          type="text"
          placeholder="Quote (e.g. USDT)"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
        />
      </div>
      <div className={styles.filtersRow}>
        <button onClick={handleApplyFilters}>Apply</button>
        <button onClick={handleReset}>Reset</button>
      </div>

      <section className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Exchange</th>
              <th>Base</th>
              <th>Quote</th>
            </tr>
          </thead>
          <tbody>
            {items.map((asset) => (
              <tr key={asset.id}>
                <td>
                  <Link
                    href={`/admin/theory-crypto/assets/${asset.id}`}
                    className={styles.symbolLink}
                  >
                    {asset.symbol}
                  </Link>
                </td>
                <td>{asset.exchange_code}</td>
                <td>{asset.base ?? "—"}</td>
                <td>{asset.quote ?? "—"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4}>No assets found.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className={styles.pagination}>
          <span>
            Page {currentPage} of {pageCount} · {assetsResponse?.total ?? 0} assets
          </span>
          <div>
            <button
              onClick={() => loadAssets(Math.max(0, offset - limit))}
              disabled={offset === 0 || loading}
            >
              Previous
            </button>
            <button
              onClick={() => loadAssets(offset + limit)}
              disabled={
                loading || !assetsResponse || offset + limit >= assetsResponse.total
              }
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}


