import { describe, it, expect, vi } from 'vitest';
import { calculateLots, fetchConversionRate, INSTRUMENTS } from './instruments';

describe('calculateLots', () => {
  it('XAUUSD no topo, seguido de BTCUSD e majors', () => {
    expect(INSTRUMENTS[0].symbol).toBe('XAUUSD');
    expect(INSTRUMENTS[1].symbol).toBe('BTCUSD');
    expect(INSTRUMENTS.map((i) => i.symbol)).toContain('EURUSD');
    expect(INSTRUMENTS.map((i) => i.symbol)).toContain('USDJPY');
  });

  const baseInput = {
    symbol: 'XAUUSD',
    balance: '50000',
    riskMode: 'pct' as const,
    riskPct: '2',
    riskFixed: '',
    entry: '2050',
    stop: '2045',
    take: '',
    conversionRate: '1',
    leverage: '500',
    commissionPerLotUsd: 0,
  };

  it('dimensiona XAUUSD pelo risco: 2% de 50000, stop 5 → 2 lotes', () => {
    const r = calculateLots(baseInput);
    // risco 1000 / (5 × 100) = 2 lotes
    expect(r.lots).toBe('2');
    expect(r.riskAccount).toBe('1000');
    expect(r.stopDistance).toBe('5');
    expect(r.stopValuePerLotQuote).toBe('500');
    expect(r.commissionUsd).toBe('0');
    expect(r.rewardAccount).toBeNull();
    expect(r.rrRatio).toBeNull();
  });

  it('conversão e comissão do tipo de conta afetam o resultado', () => {
    const r = calculateLots({
      ...baseInput,
      symbol: 'EURUSD',
      balance: '10000',
      riskPct: '1',
      entry: '1.1000',
      stop: '1.0950',
      conversionRate: '5',
      leverage: '100',
      commissionPerLotUsd: 7,
    });
    // risco 100 / (0.005 × 100000 × 5) = 0.04
    expect(r.lots).toBe('0.04');
    // comissão: 0.04 × 7 = 0.28 USD
    expect(r.commissionUsd).toBe('0.28');
  });

  it('risco em valor fixo ignora o percentual', () => {
    const r = calculateLots({ ...baseInput, riskMode: 'fixed', riskFixed: '500' });
    // 500 / (5 × 100) = 1 lote
    expect(r.lots).toBe('1');
    expect(r.riskAccount).toBe('500');
  });

  it('take profit gera recompensa e R:R', () => {
    const r = calculateLots({ ...baseInput, take: '2060' });
    // TP a 10 de distância: 10 × 100 × 2 lotes = 2000; RR 1:2
    expect(r.rewardAccount).toBe('2000');
    expect(r.rrRatio).toBe('1:2');
  });

  it('busca câmbio sem sair da moeda igual', async () => {
    await expect(fetchConversionRate('USD', 'USD')).resolves.toBe(1);
  });

  it('lê a taxa da resposta da API', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rates: { BRL: 5.42 } }),
    });
    await expect(fetchConversionRate('USD', 'BRL', fakeFetch as unknown as typeof fetch)).resolves.toBe(5.42);
    expect(fakeFetch).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/USD');
  });

  it('falha quando offline ou sem a moeda', async () => {
    const offline = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(
      fetchConversionRate('USD', 'BRL', offline as unknown as typeof fetch)
    ).rejects.toThrow();
    const noRate = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ rates: {} }) });
    await expect(
      fetchConversionRate('USD', 'BRL', noRate as unknown as typeof fetch)
    ).rejects.toThrow();
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calculateLots({ ...baseInput, stop: '2050' })).toThrow();
    expect(() => calculateLots({ ...baseInput, symbol: 'XXXYYY' })).toThrow();
    expect(() => calculateLots({ ...baseInput, conversionRate: '0' })).toThrow();
    expect(() => calculateLots({ ...baseInput, riskMode: 'fixed', riskFixed: '' })).toThrow();
    expect(() => calculateLots({ ...baseInput, take: '2050' })).toThrow();
  });
});
