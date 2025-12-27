import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@dock108/ui/theme.css";
import "./globals.css";

import { DockFooter, DockHeader } from "@dock108/ui";

export const metadata: Metadata = {
  title: "Bets - dock108",
  description: "Evaluate your betting theories with data-driven analysis",
};

/**
 * Root layout for the theory-bets-web app.
 * 
 * Provides consistent header/footer via shared DockHeader/DockFooter components
 * and applies global theme styles from @dock108/ui.
 * 
 * This app provides betting theory evaluation and sports data administration,
 * with integration to the theory-engine-api backend for evaluation and
 * the theory-bets-scraper service for data ingestion.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <DockHeader />
          <main className="app-main">{children}</main>
          <DockFooter />
        </div>
      </body>
    </html>
  );
}

