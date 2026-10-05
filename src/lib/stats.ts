import type { TradeDto, MonthlyStatsDto, Withdrawal } from './types';
import { tradeMonthKey } from './mt5';

function parseNum(value: string | null | undefined): number {
  if (!value) return 0;
  const n = parseFloat(String(value).replace(',', '.'));
  return isFinite(n) ? n : 0;
}

/**
 * Calcula as estatísticas do mês a partir das operações locais.
 * Usado enquanto o backend não serve o monthly_report.
 * return_pct e drawdown são relativos ao saldo inicial da conta.
 */
export function computeMonthlyStats(
  trades: TradeDto[],
  year: number,
  month: number,
  balance?: string
): MonthlyStatsDto {
  const balanceNum = parseNum(balance);
  let pnl = 0;
  let wins = 0;
  let grossWin = 0;
  let grossLoss = 0;

  // Drawdown sobre a curva acumulada de P&L do mês
  let peak = 0;
  let maxDdAbs = 0;
  let running = 0;

  for (const t of trades) {
    const p = parseNum(t.pnl_ccy);
    pnl += p;
    running += p;
    if (p > 0) {
      wins++;
      grossWin += p;
    } else if (p < 0) {
      grossLoss += Math.abs(p);
    }
    if (running > peak) peak = running;
    maxDdAbs = Math.max(maxDdAbs, peak - running);
  }

  const n = trades.length;
  const round2 = (v: number): string => String(Math.round(v * 100) / 100);

  return {
    year,
    month,
    pnl_abs: round2(pnl),
    return_pct: balanceNum > 0 ? round2((pnl / balanceNum) * 100) : '0',
    num_trades: n,
    win_rate: n > 0 ? round2((wins / n) * 100) : '0',
    profit_factor: grossLoss > 0 ? round2(grossWin / grossLoss) : null,
    max_drawdown_pct: balanceNum > 0 ? round2((maxDdAbs / balanceNum) * 100) : '0',
  };
}

/**
 * Saldo atual da conta: inicial + P&L de todas as operações − saques.
 * Reflete inclusive o mês em andamento.
 */
export function computeCurrentBalance(
  initial: string,
  trades: TradeDto[],
  withdrawals: Withdrawal[]
): string {
  const total =
    parseNum(initial) +
    trades.reduce((sum, t) => sum + parseNum(t.pnl_ccy), 0) -
    withdrawals.reduce((sum, w) => sum + Math.abs(parseNum(w.amount)), 0);
  return String(Math.round(total * 100) / 100);
}

/** Total sacado no mês de referência (yyyy-MM), pela data do saque. */
export function monthWithdrawals(withdrawals: Withdrawal[], monthKey: string): number {
  return withdrawals
    .filter((w) => (w.date || '').slice(0, 7) === monthKey)
    .reduce((sum, w) => sum + Math.abs(parseNum(w.amount)), 0);
}

/** Agrega as operações do ano em 12 resumos mensais (para o heatmap do dashboard). */
export function summarizeYear(trades: TradeDto[], year: number, balance?: string): MonthlyStatsDto[] {
  const out: MonthlyStatsDto[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    out.push(computeMonthlyStats(trades.filter((t) => tradeMonthKey(t) === key), year, m, balance));
  }
  return out;
}
