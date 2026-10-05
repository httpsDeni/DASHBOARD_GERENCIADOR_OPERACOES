import { describe, it, expect } from 'vitest';
import { parseMt5History, decodeReportFile, filterTradesByMonth, mt5DedupeKey, mt5PositionToTrade, tradesToCsv } from './mt5';

function toUtf16LeBytes(str: string): ArrayBuffer {
  const bytes = new Uint8Array(2 + str.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[2 + i * 2] = code & 0xff;
    bytes[2 + i * 2 + 1] = (code >> 8) & 0xff;
  }
  return bytes.buffer;
}

// Fixture fiel ao ReportHistory do MT5: cabeçalho PT, célula oculta,
// milhar com espaço, SL vazio e uma linha de balance a ignorar.
const FIXTURE = `<!DOCTYPE html><html><head><title>Relatorio</title></head><body>
<table cellspacing="1" cellpadding="3" border="0">
<tr align="center"><th colspan="14"><b>Posições</b></th></tr>
<tr align="center" bgcolor="#E5F0FC">
<td><b>Horário</b></td><td><b>Position</b></td><td><b>Ativo</b></td>
<td><b>Tipo</b></td><td><b>Volume</b></td><td><b>Preço</b></td>
<td><b>S / L</b></td><td><b>T / P</b></td><td><b>Horário</b></td>
<td><b>Preço</b></td><td><b>Comissão</b></td><td><b>Swap</b></td>
<td colspan="2"><b>Lucro</b></td></tr>
<tr bgcolor="#FFFFFF" align="right">
<td>2026.09.23 18:27:55</td><td>667106092</td><td>XAUUSD</td><td>sell</td>
<td class="hidden" colspan="8"></td>
<td>1</td><td>4286.738</td><td></td><td>4284.380</td>
<td>2026.09.23 18:44:53</td><td>4284.380</td>
<td>0.00</td><td>0.00</td><td colspan="2">1 219.18</td></tr>
<tr bgcolor="#F7F7F7" align="right">
<td>2026.10.02 09:10:00</td><td>667200001</td><td>BTCUSD</td><td>buy</td>
<td class="hidden" colspan="8"></td>
<td>0.5</td><td>110250.00</td><td>109800.00</td><td></td>
<td>2026.10.02 10:00:00</td><td>110900.00</td>
<td>-5.00</td><td>0.00</td><td colspan="2">-320.50</td></tr>
<tr bgcolor="#FFFFFF" align="right">
<td>2026.10.01 00:00:00</td><td></td><td></td><td>balance</td>
<td class="hidden" colspan="8"></td>
<td></td><td></td><td></td><td></td>
<td></td><td></td>
<td>0.00</td><td>0.00</td><td colspan="2">50 000.00</td></tr>
</table></body></html>`;

describe('parseMt5History', () => {
  it('extrai posições com preços, datas ISO e P&L líquido', () => {
    const positions = parseMt5History(FIXTURE);
    expect(positions).toHaveLength(2);

    const [xau, btc] = positions;
    expect(xau.symbol).toBe('XAUUSD');
    expect(xau.side).toBe('venda');
    expect(xau.volume).toBe('1');
    expect(xau.openPrice).toBe('4286.738');
    expect(xau.stopLoss).toBe('');
    expect(xau.takeProfit).toBe('4284.380');
    expect(xau.closePrice).toBe('4284.380');
    expect(xau.profit).toBe('1219.18');
    expect(xau.openTime.startsWith('2026-09-23')).toBe(true);
    expect(xau.closeTime.startsWith('2026-09-23')).toBe(true);

    // P&L líquido desconta comissão: -320.50 + (-5.00) = -325.50
    expect(btc.side).toBe('compra');
    expect(btc.profit).toBe('-325.5');
  });

  it('rejeita HTML sem seção de posições', () => {
    expect(() => parseMt5History('<html><body><p>nada</p></body></html>')).toThrow(/Posições/);
  });

  it('decodifica UTF-16LE do MT5 e encontra as posições', () => {
    const html = decodeReportFile(toUtf16LeBytes(FIXTURE));
    expect(html).toContain('<table');
    const positions = parseMt5History(html);
    expect(positions).toHaveLength(2);
    expect(positions[0].symbol).toBe('XAUUSD');
  });

  it('converte posição em TradeDto fechado com datas de abertura/fechamento', () => {
    const [pos] = parseMt5History(FIXTURE);
    const trade = mt5PositionToTrade(pos, 'conta-1');
    expect(trade.account_id).toBe('conta-1');
    expect(trade.status).toBe('fechado');
    expect(trade.exit).toBe('4284.380');
    expect(trade.pnl_ccy).toBe('1219.18');
    expect(trade.closed_at?.startsWith('2026-09-23')).toBe(true);
  });

  it('gera chave de dedupe estável por posição', () => {
    const [a, b] = parseMt5History(FIXTURE);
    expect(mt5DedupeKey(a)).not.toBe(mt5DedupeKey(b));
    expect(mt5DedupeKey(a)).toBe(mt5DedupeKey({ ...a }));
  });

  it('filtra só as operações do mês visualizado', () => {
    const trades = parseMt5History(FIXTURE).map((p) => mt5PositionToTrade(p, 'c1'));
    const october = filterTradesByMonth(trades, '2026-10');
    expect(october).toHaveLength(1);
    expect(october[0].symbol).toBe('BTCUSD');
    expect(filterTradesByMonth(trades, '2026-09')).toHaveLength(1);
    expect(filterTradesByMonth(trades, '2026-11')).toHaveLength(0);
  });

  it('exporta CSV com cabeçalho e linhas por operação', () => {
    const trades = parseMt5History(FIXTURE).map((p) => mt5PositionToTrade(p, 'c1'));
    const csv = tradesToCsv(trades);
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('data_abertura;data_fechamento;ativo');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('XAUUSD');
  });
});
