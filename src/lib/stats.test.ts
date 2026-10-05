import { describe, it, expect } from 'vitest';
import { computeMonthlyStats, summarizeYear, computeCurrentBalance, monthWithdrawals } from './stats';
import type { TradeDto, Withdrawal } from './types';

function withdrawal(amount: string, date: string): Withdrawal {
  return { id: `w-${amount}-${date}`, account_id: 'c1', amount, date, created_at: date };
}

function trade(pnl: string, id = Math.random().toString()): TradeDto {
  return {
    id,
    account_id: 'c1',
    symbol: 'XAUUSD',
    side: 'venda',
    entry: '100',
    stop: '99',
    take: null,
    lots: '1',
    risk_ccy: '0',
    fees: '0',
    status: 'fechado',
    exit: '99',
    pnl_ccy: pnl,
    planned_at: '2026-10-05T12:00:00.000Z',
    opened_at: '2026-10-05T12:00:00.000Z',
    closed_at: '2026-10-05T12:00:00.000Z',
  };
}

describe('computeMonthlyStats', () => {
  it('calcula totais, win rate, P&L e profit factor', () => {
    const stats = computeMonthlyStats(
      [trade('100', 'a'), trade('100', 'b'), trade('-50', 'c')],
      2026, 10, '10000'
    );
    expect(stats.num_trades).toBe(3);
    expect(stats.win_rate).toBe('66.67');
    expect(stats.pnl_abs).toBe('150');
    expect(stats.return_pct).toBe('1.5');
    expect(stats.profit_factor).toBe('4');
  });

  it('zera drawdown sem queda e mede pico-fundo', () => {
    const flat = computeMonthlyStats([trade('100', 'a'), trade('50', 'b')], 2026, 10, '10000');
    expect(flat.max_drawdown_pct).toBe('0');

    const dd = computeMonthlyStats([trade('100', 'a'), trade('-60', 'b')], 2026, 10, '10000');
    expect(dd.max_drawdown_pct).toBe('0.6');
  });

  it('sem operações retorna zeros e profit factor nulo', () => {
    const stats = computeMonthlyStats([], 2026, 10, '10000');
    expect(stats.num_trades).toBe(0);
    expect(stats.win_rate).toBe('0');
    expect(stats.profit_factor).toBeNull();
  });

  it('saldo atual soma P&L e desconta saques', () => {
    const trades = [trade('1219.18', 'a'), trade('-219.18', 'b')];
    expect(computeCurrentBalance('600000', trades, [])).toBe('601000');
    expect(
      computeCurrentBalance('600000', trades, [withdrawal('1000', '2026-10-01T12:00:00.000Z')])
    ).toBe('600000');
  });

  it('soma saques só do mês pedido', () => {
    const withdrawals = [
      withdrawal('500', '2026-10-05T12:00:00.000Z'),
      withdrawal('200', '2026-09-05T12:00:00.000Z'),
    ];
    expect(monthWithdrawals(withdrawals, '2026-10')).toBe(500);
    expect(monthWithdrawals(withdrawals, '2026-09')).toBe(200);
    expect(monthWithdrawals(withdrawals, '2026-11')).toBe(0);
  });

  it('summarizeYear agrega 12 meses com P&L por mês', () => {
    const year = new Date().getFullYear();
    const months = summarizeYear(
      [
        { ...trade('100', 'a'), closed_at: `${year}-01-05T12:00:00.000Z` },
        { ...trade('-40', 'b'), closed_at: `${year}-01-06T12:00:00.000Z` },
        { ...trade('-10', 'c'), closed_at: `${year}-03-01T12:00:00.000Z` },
      ],
      year
    );
    expect(months).toHaveLength(12);
    expect(months[0].num_trades).toBe(2);
    expect(months[0].pnl_abs).toBe('60');
    expect(months[1].num_trades).toBe(0);
    expect(months[2].pnl_abs).toBe('-10');
  });
});
