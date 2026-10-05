/**
 * Especificações de instrumentos e tipos de conta (baseado na Exness).
 * Tamanhos de contrato padrão do mercado; comissão = estimativa por lote (ida+volta).
 */

export interface InstrumentSpec {
  symbol: string;
  label: string;
  /** Moeda de cotação (últimos 3 caracteres na maioria) */
  quoteCcy: string;
  /** Unidades por 1 lote */
  contractSize: number;
}

export const INSTRUMENTS: InstrumentSpec[] = [
  { symbol: 'XAUUSD', label: 'XAUUSD (Ouro)', quoteCcy: 'USD', contractSize: 100 },
  { symbol: 'BTCUSD', label: 'BTCUSD (Bitcoin)', quoteCcy: 'USD', contractSize: 1 },
  { symbol: 'EURUSD', label: 'EURUSD', quoteCcy: 'USD', contractSize: 100000 },
  { symbol: 'GBPUSD', label: 'GBPUSD', quoteCcy: 'USD', contractSize: 100000 },
  { symbol: 'AUDUSD', label: 'AUDUSD', quoteCcy: 'USD', contractSize: 100000 },
  { symbol: 'NZDUSD', label: 'NZDUSD', quoteCcy: 'USD', contractSize: 100000 },
  { symbol: 'USDJPY', label: 'USDJPY', quoteCcy: 'JPY', contractSize: 100000 },
  { symbol: 'USDCAD', label: 'USDCAD', quoteCcy: 'CAD', contractSize: 100000 },
  { symbol: 'USDCHF', label: 'USDCHF', quoteCcy: 'CHF', contractSize: 100000 },
];

/**
 * Busca a taxa 1 <quoteCcy> = X <accountCcy> na internet (API gratuita, sem chave).
 * `fetchFn` injetável para testes. Lança erro quando offline ou sem a moeda.
 */
export async function fetchConversionRate(
  quoteCcy: string,
  accountCcy: string,
  fetchFn: typeof fetch = fetch
): Promise<number> {
  if (quoteCcy === accountCcy) return 1;
  const res = await fetchFn(`https://open.er-api.com/v6/latest/${quoteCcy}`);
  if (!res.ok) throw new Error(`Falha na cotação (HTTP ${res.status})`);
  const data: unknown = await res.json();
  const rate =
    typeof data === 'object' && data !== null && 'rates' in data
      ? (data as { rates: Record<string, unknown> }).rates[accountCcy]
      : undefined;
  if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) {
    throw new Error(`Moeda ${accountCcy} fora da resposta`);
  }
  return rate;
}

export interface ExnessAccountType {
  id: string;
  label: string;
  /** Comissão estimada em USD por lote (ida + volta) */
  commissionPerLotUsd: number;
}

export const EXNESS_ACCOUNT_TYPES: ExnessAccountType[] = [
  { id: 'standard', label: 'Standard (sem comissão)', commissionPerLotUsd: 0 },
  { id: 'pro', label: 'Pro (sem comissão)', commissionPerLotUsd: 0 },
  { id: 'raw', label: 'Raw Spread (~US$ 7,00/lote)', commissionPerLotUsd: 7 },
  { id: 'zero', label: 'Zero (~US$ 4,00/lote)', commissionPerLotUsd: 4 },
];

export interface SizingInput {
  symbol: string;
  balance: string;
  /** 'pct' = % do saldo | 'fixed' = valor fixo na moeda da conta */
  riskMode: 'pct' | 'fixed';
  riskPct: string;
  riskFixed: string;
  entry: string;
  stop: string;
  /** Take profit (opcional) */
  take: string;
  /** Taxa de conversão: 1 unidade da moeda cotada = X da moeda da conta */
  conversionRate: string;
  leverage: string;
  commissionPerLotUsd: number;
}

export interface SizingResult {
  lots: string;
  /** Risco em moeda da conta */
  riskAccount: string;
  /** Distância do stop em preço */
  stopDistance: string;
  /** Valor do stop por lote na moeda cotada */
  stopValuePerLotQuote: string;
  /** Margem estimada na moeda da conta */
  marginAccount: string;
  /** Comissão estimada em USD (ida + volta) */
  commissionUsd: string;
  /** Recompensa até o TP na moeda da conta (null sem TP) */
  rewardAccount: string | null;
  /** Relação risco:recompensa (null sem TP) */
  rrRatio: string | null;
}

function parseNum(value: string): number {
  const n = parseFloat(String(value).replace(',', '.'));
  return isFinite(n) ? n : NaN;
}

/**
 * Lotes = risco / (distância × contrato × conversão).
 * Margem = lotes × contrato × preço / alavancagem (convertida).
 * Comissão = lotes × taxa do tipo de conta (estimativa, em USD).
 */
export function calculateLots(input: SizingInput): SizingResult {
  const spec = INSTRUMENTS.find((i) => i.symbol === input.symbol);
  if (!spec) throw new Error(`Instrumento desconhecido: ${input.symbol}`);

  const balance = parseNum(input.balance);
  const entry = parseNum(input.entry);
  const stop = parseNum(input.stop);
  const rate = parseNum(input.conversionRate);
  const leverage = parseNum(input.leverage);

  if (!isFinite(balance) || balance <= 0) throw new Error('Saldo inválido');
  if (!isFinite(entry) || !isFinite(stop)) throw new Error('Entry/stop inválidos');
  const dist = Math.abs(entry - stop);
  if (dist <= 0) throw new Error('Entry igual ao stop');
  if (!isFinite(rate) || rate <= 0) throw new Error('Taxa de conversão inválida');
  if (!isFinite(leverage) || leverage <= 0) throw new Error('Alavancagem inválida');

  let riskAccount: number;
  if (input.riskMode === 'fixed') {
    riskAccount = parseNum(input.riskFixed);
    if (!isFinite(riskAccount) || riskAccount <= 0) throw new Error('Valor de risco inválido');
  } else {
    const riskPct = parseNum(input.riskPct);
    if (!isFinite(riskPct) || riskPct <= 0) throw new Error('Risco % inválido');
    riskAccount = balance * (riskPct / 100);
  }
  const stopValuePerLotQuote = dist * spec.contractSize;
  const lots = riskAccount / (stopValuePerLotQuote * rate);
  const marginAccount = ((lots * spec.contractSize * entry) / leverage) * rate;
  const commissionUsd = lots * input.commissionPerLotUsd;

  const round = (v: number, digits: number): string => {
    const f = 10 ** digits;
    return String(Math.round(v * f) / f);
  };

  let rewardAccount: string | null = null;
  let rrRatio: string | null = null;
  const take = input.take.trim() === '' ? NaN : parseNum(input.take);
  if (isFinite(take)) {
    const tpDist = Math.abs(take - entry);
    if (tpDist <= 0) throw new Error('Take igual à entrada');
    rewardAccount = round(tpDist * spec.contractSize * lots * rate, 2);
    rrRatio = `1:${round(tpDist / dist, 2)}`;
  }

  return {
    lots: round(lots, 2),
    riskAccount: round(riskAccount, 2),
    stopDistance: round(dist, 5),
    stopValuePerLotQuote: round(stopValuePerLotQuote, 2),
    marginAccount: round(marginAccount, 2),
    commissionUsd: round(commissionUsd, 2),
    rewardAccount,
    rrRatio,
  };
}
