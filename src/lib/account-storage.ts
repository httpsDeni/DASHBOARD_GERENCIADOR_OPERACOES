import type { AccountDto } from './types';

const STORAGE_KEY = 'gerenciador-risco:account:v1';

function isAccountDto(value: unknown): value is AccountDto {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.balance_inicial === 'string' && typeof v.ccy === 'string';
}

/** Salva a conta ativa no navegador para não precisar recriar a cada abertura. */
export function saveAccount(account: AccountDto): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  } catch {
    // Armazenamento indisponível (ex.: modo privado): app segue em memória
  }
}

/** Restaura a conta salva, ou null quando não há nenhuma válida. */
export function loadAccount(): AccountDto | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAccountDto(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearAccount(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sem armazenamento: nada a limpar
  }
}
