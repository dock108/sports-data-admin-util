/**
 * Season date range utilities for sports leagues.
 * 
 * Provides full season date ranges (including playoffs/championships) with buffer
 * for each league. Used when season is selected but dates are not provided.
 */

import type { LeagueCode } from "@/lib/constants/sports";

export type { LeagueCode };

export interface SeasonDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Get full season date range for a league and season year.
 * 
 * Season ranges include regular season + playoffs/championships with buffer.
 * 
 * @param league - League code (NBA, NFL, MLB, etc.)
 * @param seasonYear - Season year (e.g., 2024 for 2024-25 season)
 * @returns Date range object with startDate and endDate
 */
export function getFullSeasonDates(league: LeagueCode, seasonYear: number): SeasonDateRange {
  const year = Math.floor(seasonYear);
  const nextYear = year + 1;
  
  const formatDate = (y: number, m: number, d: number): string => {
    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  switch (league) {
    case "MLB":
      return {
        startDate: formatDate(year, 3, 1),
        endDate: formatDate(year, 11, 15),
      };

    case "NBA":
      return {
        startDate: formatDate(year, 10, 1),
        endDate: formatDate(nextYear, 6, 30),
      };

    case "NFL":
      return {
        startDate: formatDate(year, 9, 1),
        endDate: formatDate(nextYear, 2, 28),
      };

    case "NHL":
      return {
        startDate: formatDate(year, 10, 1),
        endDate: formatDate(nextYear, 6, 30),
      };

    case "NCAAB":
      return {
        startDate: formatDate(year, 11, 1),
        endDate: formatDate(nextYear, 4, 30),
      };

    case "NCAAF":
      return {
        startDate: formatDate(year, 8, 1),
        endDate: formatDate(nextYear, 1, 31),
      };

    default:
      return {
        startDate: formatDate(year, 1, 1),
        endDate: formatDate(year, 12, 31),
      };
  }
}

/**
 * Check if dates should be auto-filled based on form state.
 * 
 * @param league - Selected league
 * @param season - Selected season (year as string)
 * @param startDate - Current start date
 * @param endDate - Current end date
 * @returns True if dates should be auto-filled
 */
export function shouldAutoFillDates(
  league: LeagueCode,
  season: string,
  startDate: string,
  endDate: string
): boolean {
  return !!season && !startDate && !endDate;
}

