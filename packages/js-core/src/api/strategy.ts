/**
 * Strategy API methods for crypto strategy interpretation, backtesting, and alerts.
 */

import { APIClient } from "./client";
import type {
  StrategyResponse,
  StrategySaveRequest,
  BacktestRequest,
  BacktestResult,
  AlertEvent,
  ToggleAlertsRequest,
} from "../types";

export interface StrategyInterpretOptions {
  userId?: number;
  ticker?: string;
  scenarioType?: string;
  assets?: string[];
  capital?: number;
  capitalCurrency?: string;
  timeHorizon?: string;
  riskComfort?: string;
  dataSources?: string[];
  includeSector?: boolean;
}

export class StrategyAPI {
  private basePath: string;

  constructor(private client: APIClient, basePath = "/api/strategy") {
    this.basePath = basePath.replace(/\/$/, "");
  }

  /**
   * Get a strategy by ID.
   */
  async get(strategyId: string): Promise<StrategyResponse> {
    return this.client.get<StrategyResponse>(`${this.basePath}/${encodeURIComponent(strategyId)}`);
  }

  /**
   * Interpret a crypto strategy idea into a structured strategy packet.
   */
  async interpret(ideaText: string, options?: StrategyInterpretOptions): Promise<StrategyResponse> {
    return this.client.post<StrategyResponse>(`${this.basePath}/interpret`, {
      ideaText,
      userId: options?.userId,
      ticker: options?.ticker,
      scenarioType: options?.scenarioType,
      assets: options?.assets,
      capital: options?.capital,
      capitalCurrency: options?.capitalCurrency,
      timeHorizon: options?.timeHorizon,
      riskComfort: options?.riskComfort,
      dataSources: options?.dataSources,
      includeSector: options?.includeSector,
    });
  }

  /**
   * Save or update a strategy.
   */
  async save(request: StrategySaveRequest): Promise<StrategyResponse> {
    return this.client.post<StrategyResponse>(`${this.basePath}/save`, request);
  }

  /**
   * Run a backtest for a strategy.
   */
  async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    return this.client.post<BacktestResult>(`${this.basePath}/backtest`, request);
  }

  /**
   * Fetch alert events for a strategy.
   */
  async fetchAlerts(strategyId: string): Promise<AlertEvent[]> {
    const response = await this.client.get<{ events: AlertEvent[] }>(
      `${this.basePath}/alerts?strategyId=${encodeURIComponent(strategyId)}`
    );
    return response.events;
  }

  /**
   * Toggle alerts enabled/disabled for a strategy.
   */
  async toggleAlerts(request: ToggleAlertsRequest): Promise<{ strategyId: string; enabled: boolean }> {
    return this.client.post<{ strategyId: string; enabled: boolean }>(`${this.basePath}/alerts`, request);
  }
}

