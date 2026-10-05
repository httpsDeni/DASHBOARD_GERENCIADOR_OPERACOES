import { describe, it, expect, beforeEach } from 'vitest';
import { saveTrades, loadTrades, clearTrades } from './trade-storage';
import type { TradeDto } from './types';

function trade(id: string): TradeDto {
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
    pnl_ccy: '10',
    planned_at: '2026-10-05T12:00:00.000Z',
    opened_at: '2026-10-05T12:00:00.000Z',
    closed_at: '2026-10-05T12:00:00.000Z',
  };
}

describe('trade-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('salva e restaura as operações da conta', () => {
    saveTrades('c1', [trade('a'), trade('b')]);
    expect(loadTrades('c1')).toHaveLength(2);
  });

  it('isola contas diferentes', () => {
    saveTrades('c1', [trade('a')]);
    expect(loadTrades('c2')).toEqual([]);
  });

  it('ignora registros inválidos e JSON corrompido', () => {
    localStorage.setItem('gerenciador-risco:trades:v1:c1', JSON.stringify([trade('a'), { id: 123 }, null]));
    expect(loadTrades('c1')).toHaveLength(1);
    localStorage.setItem('gerenciador-risco:trades:v1:c1', '{invalido');
    expect(loadTrades('c1')).toEqual([]);
  });

  it('limpa as operações da conta', () => {
    saveTrades('c1', [trade('a')]);
    clearTrades('c1');
    expect(loadTrades('c1')).toEqual([]);
  });
});
