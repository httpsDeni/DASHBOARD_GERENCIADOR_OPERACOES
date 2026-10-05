/**
 * Tipos TypeScript para o Gerenciador de Risco
 */

export interface Trade {
  id: string;
  instrument: string;
  entry: number;
  stop: number;
  takeProfit?: number;
  date: Date;
  pnl?: number;
  riskPercentage: number;
  lotSize: number;
}

export interface MonthMetrics {
  month: number;
  year: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  averageRiskRewardRatio: number;
  maxDrawdown: number;
}

export interface PositionSizeRequest {
  instrument: string;
  entry: number;
  stop: number;
  accountSize: number;
  riskPercent: number;
  takeProfit?: number;
}

export interface PositionSizeResponse {
  lotSize: number;
  riskAmount: number;
  rewardAmount?: number;
  riskRewardRatio?: number;
}

export interface MonthData {
  month: string;
  metrics: MonthMetrics;
  winRate: number;
}
