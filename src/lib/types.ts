/**
 * Tipos TypeScript para o Gerenciador de Risco
 * Importados do backend Piloto via ts-rs bindings
 */

// DTOs do Piloto (via ts-rs)

export interface CreateAccountRequest {
  balance_inicial: string;
  ccy: string;
  timezone: string;
  risco_por_trade_pct: string;
  perda_max_diaria_pct: string;
  perda_max_mensal_pct: string;
  dd_max_pct: string;
}

export interface AccountDto {
  id: string;
  balance_inicial: string;
  ccy: string;
  timezone: string;
  risco_por_trade_pct: string;
  perda_max_diaria_pct: string;
  perda_max_mensal_pct: string;
  dd_max_pct: string;
}

export interface CalculatePositionSizeRequest {
  symbol: string;
  side: string;
  entry: string;
  stop: string;
  balance: string;
  risk_pct: string;
}

export interface PositionSizeResponseDto {
  lots: string;
  risk_ccy_efetivo: string;
  stop_distance: string;
}

export interface PlanTradeRequest {
  account_id: string;
  symbol: string;
  side: string;
  entry: string;
  stop: string;
  take: string | null;
  fees: string | null;
}

export interface TradeDto {
  id: string;
  account_id: string;
  symbol: string;
  side: string;
  entry: string;
  stop: string;
  take: string | null;
  lots: string;
  risk_ccy: string;
  fees: string;
  status: string;
  exit: string | null;
  pnl_ccy: string | null;
  planned_at: string;
  opened_at: string | null;
  closed_at: string | null;
}

export interface CloseTradeRequest {
  account_id: string;
  trade_id: string;
  exit: string;
  extra_fees: string | null;
}

export interface MonthlyReportRequest {
  account_id: string;
  year: number;
  month: number;
}

export interface YearReportRequest {
  account_id: string;
  year: number;
}

export interface MonthlyStatsDto {
  year: number;
  month: number;
  pnl_abs: string;
  return_pct: string;
  num_trades: number;
  win_rate: string;
  profit_factor: string | null;
  max_drawdown_pct: string;
}

export interface YearlyStatsDto {
  year: number;
  pnl_abs: string;
  compound_return_pct: string;
  best_month: [number, number, string] | null;
  worst_month: [number, number, string] | null;
  positive_months: number;
  total_months: number;
}

export interface AppErrorDto {
  code: string;
  message: string;
}

export interface Withdrawal {
  id: string;
  account_id: string;
  amount: string;
  date: string; // ISO
  created_at: string; // ISO
}

// Legacy interfaces para manter compatibilidade (mapeados dos DTOs)

export interface Trade extends TradeDto {}

export interface MonthMetrics extends MonthlyStatsDto {
  winningTrades?: number;
  losingTrades?: number;
  winRate?: number;
  totalPnL?: number;
  averageRiskRewardRatio?: number;
  maxDrawdown?: number;
}

export interface PositionSizeResponse extends PositionSizeResponseDto {
  lotSize?: number;
  riskAmount?: number;
  rewardAmount?: number;
  riskRewardRatio?: number;
}

export interface MonthData {
  month: string;
  metrics: MonthMetrics;
  winRate: number;
}
