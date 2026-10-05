import { describe, it, expect, beforeEach } from 'vitest';
import { saveAccount, loadAccount, clearAccount } from './account-storage';
import type { AccountDto } from './types';

const ACCOUNT: AccountDto = {
  id: 'conta-1',
  balance_inicial: '50000',
  ccy: 'BRL',
  timezone: 'America/Sao_Paulo',
  risco_por_trade_pct: '2',
  perda_max_diaria_pct: '5',
  perda_max_mensal_pct: '10',
  dd_max_pct: '15',
};

describe('account-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('salva e restaura a conta', () => {
    saveAccount(ACCOUNT);
    expect(loadAccount()).toEqual(ACCOUNT);
  });

  it('retorna null quando nada foi salvo', () => {
    expect(loadAccount()).toBeNull();
  });

  it('ignora JSON corrompido ou formato inválido', () => {
    localStorage.setItem('gerenciador-risco:account:v1', '{invalido');
    expect(loadAccount()).toBeNull();
    localStorage.setItem('gerenciador-risco:account:v1', '{"id":123}');
    expect(loadAccount()).toBeNull();
  });

  it('sobrescreve a conta anterior e limpa ao pedir', () => {
    saveAccount(ACCOUNT);
    saveAccount({ ...ACCOUNT, id: 'conta-2' });
    expect(loadAccount()?.id).toBe('conta-2');
    clearAccount();
    expect(loadAccount()).toBeNull();
  });
});
