import type { Withdrawal } from './types';

const KEY_PREFIX = 'gerenciador-risco:saques:v1:';

function isWithdrawal(value: unknown): value is Withdrawal {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.amount === 'string' &&
    typeof v.date === 'string'
  );
}

export function saveWithdrawals(accountId: string, withdrawals: Withdrawal[]): void {
  try {
    localStorage.setItem(KEY_PREFIX + accountId, JSON.stringify(withdrawals));
  } catch {
    // Quota esgotada ou sem armazenamento: mantém em memória
  }
}

export function loadWithdrawals(accountId: string): Withdrawal[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + accountId);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWithdrawal);
  } catch {
    return [];
  }
}
