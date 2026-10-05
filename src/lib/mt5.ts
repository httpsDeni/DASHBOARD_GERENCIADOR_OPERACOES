import type { TradeDto } from './types';

/**
 * Posição round-trip extraída da seção "Posições" (Positions) do
 * Relatório do Histórico de Negociação do MT5 (HTML).
 */
export interface Mt5Position {
  ticket: string;
  symbol: string;
  side: 'compra' | 'venda';
  volume: string;
  openPrice: string;
  stopLoss: string;
  takeProfit: string;
  openTime: string; // ISO
  closeTime: string; // ISO
  closePrice: string;
  commission: string;
  swap: string;
  /** P&L líquido = lucro + comissão + swap (moeda da conta) */
  profit: string;
}

const DATE_RE = /^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}(:\d{2})?$/;

/**
 * Decodifica o HTML do MT5. O terminal grava o relatório em UTF-16LE
 * (com BOM FF FE); cai para UTF-8 e por fim Windows-1252.
 */
export function decodeReportFile(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buffer);
  }
  // Heurística: muitos nulos intercalados indicam UTF-16 sem BOM
  const sample = bytes.subarray(0, Math.min(bytes.length, 1024));
  let oddNulls = 0;
  let evenNulls = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) {
      if (i % 2 === 1) oddNulls++;
      else evenNulls++;
    }
  }
  if (oddNulls > sample.length / 8) return new TextDecoder('utf-16le').decode(buffer);
  if (evenNulls > sample.length / 8) return new TextDecoder('utf-16be').decode(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function cleanNumber(raw: string): string {
  return raw.replace(/[\s\u00a0\u2009\u202f]/g, '').trim();
}

function toISO(mt5date: string): string | null {
  const m = mt5date.trim().match(/^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}:\d{2}(?::\d{2})?)$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function mapSide(type: string): 'compra' | 'venda' | null {
  const t = type.trim().toLowerCase();
  if (t === 'buy' || t === 'compra') return 'compra';
  if (t === 'sell' || t === 'venda') return 'venda';
  return null;
}

/**
 * Extrai as posições da seção "Posições" do HTML do MT5.
 * Lança erro quando o arquivo não é um relatório de histórico válido.
 */
export function parseMt5History(html: string): Mt5Position[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = Array.from(doc.querySelectorAll('table'));

  const positionsTable = tables.find((table) => {
    const headerText = Array.from(table.querySelectorAll('td b, th'))
      .map((el) => (el.textContent || '').trim().toLowerCase())
      .join('|');
    return (
      headerText.includes('position') &&
      (headerText.includes('ativo') || headerText.includes('symbol'))
    );
  });

  if (!positionsTable) {
    throw new Error(
      'Seção "Posições" não encontrada. Exporte no MT5 o Relatório do Histórico de Negociação (HTML), não o relatório do testador.'
    );
  }

  const positions: Mt5Position[] = [];
  for (const row of Array.from(positionsTable.querySelectorAll('tr'))) {
    const cells = Array.from(row.querySelectorAll('td'))
      .filter((td) => !td.classList.contains('hidden'))
      .map((td) => (td.textContent || '').replace(/\u00a0/g, ' ').trim());

    // [abertura, ticket, ativo, tipo, volume, preço_ab, sl, tp, fechamento, preço_fe, comissão, swap, lucro]
    if (cells.length < 13 || !DATE_RE.test(cells[0])) continue;
    const side = mapSide(cells[3]);
    const symbol = cells[2].trim();
    if (!side || !symbol) continue; // ignora balance/correction/sem ativo

    const openTime = toISO(cells[0]);
    const closeTime = toISO(cells[8]);
    if (!openTime || !closeTime) continue;

    const profit = parseFloat(cleanNumber(cells[12]));
    const commission = parseFloat(cleanNumber(cells[10])) || 0;
    const swap = parseFloat(cleanNumber(cells[11])) || 0;
    if (!isFinite(profit)) continue;

    const net = Math.round((profit + commission + swap) * 100) / 100;

    positions.push({
      ticket: cells[1],
      symbol,
      side,
      volume: cleanNumber(cells[4]) || '0',
      openPrice: cleanNumber(cells[5]),
      stopLoss: cleanNumber(cells[6]),
      takeProfit: cleanNumber(cells[7]),
      openTime,
      closeTime,
      closePrice: cleanNumber(cells[9]),
      commission: String(commission),
      swap: String(swap),
      profit: String(net),
    });
  }

  return positions;
}

/** Chave de dedupe sobre o TradeDto já convertido (mesmos campos da chave natural). */
export function tradeDedupeKey(t: TradeDto): string {
  return [t.symbol, t.side, t.lots, t.entry, t.exit ?? '', t.planned_at, t.closed_at ?? ''].join('|');
}

/** Chave natural para não importar a mesma posição duas vezes. */
export function mt5DedupeKey(pos: Mt5Position): string {
  return [pos.ticket, pos.symbol, pos.side, pos.volume, pos.openPrice, pos.closePrice, pos.openTime, pos.closeTime].join('|');
}

export function mt5PositionToTrade(pos: Mt5Position, accountId: string): TradeDto {
  return {
    id: crypto.randomUUID(),
    account_id: accountId,
    symbol: pos.symbol,
    side: pos.side,
    entry: pos.openPrice,
    stop: pos.stopLoss || '',
    take: pos.takeProfit || null,
    lots: pos.volume,
    risk_ccy: '0',
    fees: pos.commission,
    status: 'fechado',
    exit: pos.closePrice,
    pnl_ccy: pos.profit,
    planned_at: pos.openTime,
    opened_at: pos.openTime,
    closed_at: pos.closeTime,
  };
}

/** CSV das operações (UTF-8 com BOM, pronto para Excel). */
export function tradesToCsv(trades: TradeDto[]): string {
  const header = 'data_abertura;data_fechamento;ativo;direcao;volume_lotes;entrada;stop;take_profit;saida;taxas;pnl;status';
  const lines = trades.map((t) =>
    [
      t.opened_at ?? t.planned_at,
      t.closed_at ?? '',
      t.symbol,
      t.side,
      t.lots,
      t.entry,
      t.stop,
      t.take ?? '',
      t.exit ?? '',
      t.fees,
      t.pnl_ccy ?? '',
      t.status,
    ].join(';')
  );
  return '\uFEFF' + [header, ...lines].join('\r\n');
}

/** Mês (yyyy-MM) de referência da operação: fechamento, ou abertura se aberta. */
export function tradeMonthKey(trade: TradeDto): string {
  return (trade.closed_at ?? trade.planned_at).slice(0, 7);
}

/** Mantém só as operações do mês de referência (yyyy-MM). */
export function filterTradesByMonth(trades: TradeDto[], monthKey: string): TradeDto[] {
  return trades.filter((t) => tradeMonthKey(t) === monthKey);
}
