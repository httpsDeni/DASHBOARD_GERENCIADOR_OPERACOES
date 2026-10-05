import type { TradeDto } from './types';

const KEY_PREFIX = 'gerenciador-risco:trades:v1:';

function isTradeDto(value: unknown): value is TradeDto {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.symbol === 'string' &&
    typeof v.side === 'string' &&
    typeof v.planned_at === 'string'
  );
}

/** Salva as operações da conta no navegador.Backup contra fechar/recarregar o app. */
export function saveTrades(accountId: string, trades: TradeDto[]): void {
  try {
    localStorage.setItem(KEY_PREFIX + accountId, JSON.stringify(trades));
  } catch {
    // Quota esgotada ou sem armazenamento: mantém em memória
  }
}

/** Restaura as operações salvas da conta; ignora registros inválidos. */
export function loadTrades(accountId: string): TradeDto[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + accountId);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTradeDto);
  } catch {
    return [];
  }
}

export function clearTrades(accountId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + accountId);
  } catch {
    // Sem armazenamento: nada a limpar
  }
}
