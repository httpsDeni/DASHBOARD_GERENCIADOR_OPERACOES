import { describe, it, expect } from 'vitest';
import { formatBalance } from './format';

describe('formatBalance', () => {
  it('separa milhares no padrão pt-BR', () => {
    expect(formatBalance('600000')).toBe('600.000');
    expect(formatBalance('50000')).toBe('50.000');
  });

  it('mantém decimais quando existem', () => {
    expect(formatBalance('1219.18')).toBe('1.219,18');
  });

  it('devolve original quando não é número e "-" quando vazio', () => {
    expect(formatBalance('abc')).toBe('abc');
    expect(formatBalance('')).toBe('-');
    expect(formatBalance(null)).toBe('-');
  });
});
