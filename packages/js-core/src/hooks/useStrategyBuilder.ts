/**
 * React hook for strategy builder operations.
 */

import { useState, useCallback } from "react";
import { StrategyAPI, createClient } from "../api";
import type {
  StrategyResponse,
  StrategySaveRequest,
  BacktestRequest,
  BacktestResult,
  AlertEvent,
  ToggleAlertsRequest,
} from "../types";

interface UseStrategyBuilderState {
  ideaText: string;
  isInterpreting: boolean;
  isSaving: boolean;
  isBacktesting: boolean;
  isTogglingAlerts: boolean;
  strategy: StrategyResponse | null;
  backtest: BacktestResult | null;
  alerts: AlertEvent[];
  alertsEnabled: boolean;
  error: Error | null;
}

interface UseStrategyBuilderReturn {
  ideaText: string;
  isInterpreting: boolean;
  isSaving: boolean;
  isBacktesting: boolean;
  isTogglingAlerts: boolean;
  strategy: StrategyResponse | null;
  backtest: BacktestResult | null;
  alerts: AlertEvent[];
  alertsEnabled: boolean;
  error: Error | null;
  setIdeaText: (text: string) => void;
  interpret: (ideaText: string, userId?: number) => Promise<StrategyResponse | null>;
  save: (request: StrategySaveRequest) => Promise<StrategyResponse | null>;
  runBacktest: (request: BacktestRequest) => Promise<BacktestResult | null>;
  refreshAlerts: (strategyId: string) => Promise<void>;
  toggleAlerts: (request: ToggleAlertsRequest) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for building and managing crypto strategies.
 */
export function useStrategyBuilder(baseURL?: string, apiBasePath = "/api/strategy"): UseStrategyBuilderReturn {
  const [state, setState] = useState<UseStrategyBuilderState>({
    ideaText: "",
    isInterpreting: false,
    isSaving: false,
    isBacktesting: false,
    isTogglingAlerts: false,
    strategy: null,
    backtest: null,
    alerts: [],
    alertsEnabled: false,
    error: null,
  });

  const client = createClient(baseURL);
  const api = new StrategyAPI(client, apiBasePath);

  const setIdeaText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, ideaText: text }));
  }, []);

  const interpret = useCallback(
    async (ideaText: string, userId?: number): Promise<StrategyResponse | null> => {
      setState((prev) => ({ ...prev, isInterpreting: true, error: null }));
      try {
        const response = await api.interpret(ideaText, userId ? { userId } : undefined);
        const alertsEnabled = response.alertSpec.triggers.length > 0;
        setState((prev) => ({
          ...prev,
          strategy: response,
          ideaText,
          alertsEnabled,
          isInterpreting: false,
          error: null,
        }));
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({ ...prev, isInterpreting: false, error }));
        return null;
      }
    },
    [api]
  );

  const save = useCallback(
    async (request: StrategySaveRequest): Promise<StrategyResponse | null> => {
      setState((prev) => ({ ...prev, isSaving: true, error: null }));
      try {
        const response = await api.save(request);
        setState((prev) => ({
          ...prev,
          strategy: response,
          isSaving: false,
          error: null,
        }));
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({ ...prev, isSaving: false, error }));
        return null;
      }
    },
    [api]
  );

  const runBacktest = useCallback(
    async (request: BacktestRequest): Promise<BacktestResult | null> => {
      setState((prev) => ({ ...prev, isBacktesting: true, error: null }));
      try {
        const result = await api.runBacktest(request);
        setState((prev) => ({
          ...prev,
          backtest: result,
          isBacktesting: false,
          error: null,
        }));
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({ ...prev, isBacktesting: false, error }));
        return null;
      }
    },
    [api]
  );

  const refreshAlerts = useCallback(
    async (strategyId: string): Promise<void> => {
      try {
        const events = await api.fetchAlerts(strategyId);
        setState((prev) => ({ ...prev, alerts: events }));
      } catch (err) {
        // Silently fail, keep existing alerts
        console.warn("Failed to refresh alerts", err);
      }
    },
    [api]
  );

  const toggleAlerts = useCallback(
    async (request: ToggleAlertsRequest): Promise<void> => {
      setState((prev) => ({ ...prev, isTogglingAlerts: true }));
      try {
        await api.toggleAlerts(request);
        setState((prev) => ({
          ...prev,
          alertsEnabled: request.enabled,
          isTogglingAlerts: false,
        }));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({ ...prev, isTogglingAlerts: false, error }));
        throw error;
      }
    },
    [api]
  );

  const reset = useCallback(() => {
    setState({
      ideaText: "",
      isInterpreting: false,
      isSaving: false,
      isBacktesting: false,
      isTogglingAlerts: false,
      strategy: null,
      backtest: null,
      alerts: [],
      alertsEnabled: false,
      error: null,
    });
  }, []);

  return {
    ideaText: state.ideaText,
    isInterpreting: state.isInterpreting,
    isSaving: state.isSaving,
    isBacktesting: state.isBacktesting,
    isTogglingAlerts: state.isTogglingAlerts,
    strategy: state.strategy,
    backtest: state.backtest,
    alerts: state.alerts,
    alertsEnabled: state.alertsEnabled,
    error: state.error,
    setIdeaText,
    interpret,
    save,
    runBacktest,
    refreshAlerts,
    toggleAlerts,
    reset,
  };
}

