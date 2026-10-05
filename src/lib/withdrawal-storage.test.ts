import { describe, it, expect, beforeEach } from 'vitest';
import { saveWithdrawals, loadWithdrawals } from './withdrawal-storage';
import type { Withdrawal } from './types';

function withdrawal(id: string): Withdrawal {
  return {
    id,
    account_id: 'c1',
    amount: '500',
    date: '2026-10-05T12:00:00.000Z',
    created_at: '2026-10-05T12:00:00.000Z',
  };
}

describe('withdrawal-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('salva e restaura os saques da conta', () => {
    saveWithdrawals('c1', [withdrawal('a'), withdrawal('b')]);
    expect(loadWithdrawals('c1')).toHaveLength(2);
  });

  it('isola contas e ignora registros inválidos', () => {
    saveWithdrawals('c1', [withdrawal('a')]);
    expect(loadWithdrawals('c2')).toEqual([]);
    localStorage.setItem('gerenciador-risco:saques:v1:c1', JSON.stringify([withdrawal('a'), { id: 1 }]));
    expect(loadWithdrawals('c1')).toHaveLength(1);
  });
});
