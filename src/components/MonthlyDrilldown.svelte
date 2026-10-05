<script lang="ts">
  import type { TradeDto, MonthlyStatsDto, Withdrawal } from '$lib/types';
  import {
    parseMt5History,
    decodeReportFile,
    mt5PositionToTrade,
    tradesToCsv,
    tradeMonthKey,
    type Mt5Position,
  } from '$lib/mt5';
  import { computeMonthlyStats } from '$lib/stats';

  export let month: number = new Date().getMonth() + 1;
  export let year: number = new Date().getFullYear();
  export let trades: TradeDto[] = [];
  export let metrics: MonthlyStatsDto | null = null;
  export let accountId: string = '';
  export let accountBalance: string = '';
  export let onBack: () => void = () => {};
  export let onTradesImported: (trades: TradeDto[]) => { added: number; duplicates: number; skipped: number } =
    () => ({ added: 0, duplicates: 0, skipped: 0 });
  export let onNewTrade: () => void = () => {};
  export let onEditTrade: (trade: TradeDto) => void = () => {};
  export let onDeleteTrade: (tradeId: string) => void = () => {};
  export let withdrawals: Withdrawal[] = [];
  export let onWithdrawRequest: () => void = () => {};
  export let onDeleteWithdrawal: (withdrawalId: string) => void = () => {};

  function confirmDelete(trade: TradeDto): void {
    const when = formatDate(trade.closed_at ?? trade.planned_at);
    if (window.confirm(`Excluir operação ${trade.symbol} ${trade.side} de ${when}?`)) {
      onDeleteTrade(trade.id);
    }
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  let fileInput: HTMLInputElement;
  let importing: boolean = false;
  let importMessage: string | null = null;
  let importError: string | null = null;

  $: monthKey = `${year}-${String(month).padStart(2, '0')}`;
  $: monthTrades = trades.filter((t) => tradeMonthKey(t) === monthKey);
  // Backend ainda não serve o monthly_report: com métricas vazias, calcula das operações locais
  $: effectiveMetrics =
    metrics && metrics.num_trades > 0
      ? metrics
      : computeMonthlyStats(monthTrades, year, month, accountBalance);
  $: totalFees = monthTrades.reduce((sum, t) => sum + parseNum(t.fees), 0);
  $: monthWithdrawals = withdrawals.filter((w) => (w.date || '').slice(0, 7) === monthKey);
  $: totalWithdrawn = monthWithdrawals.reduce((sum, w) => sum + Math.abs(parseNum(w.amount)), 0);

  function parseNum(value: string | null | undefined): number {
    if (!value) return 0;
    const n = parseFloat(value.replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  function formatMoney(value: string | null): string {
    const n = parseNum(value);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function decodeFile(file: File): Promise<string> {
    return decodeReportFile(await file.arrayBuffer());
  }

  async function handleFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    importMessage = null;
    importError = null;
    importing = true;
    try {
      const html = await decodeFile(file);
      const positions: Mt5Position[] = parseMt5History(html);
      if (positions.length === 0) {
        importError = 'Nenhuma posição encontrada neste relatório.';
        return;
      }
      const newTrades = positions.map((p) => mt5PositionToTrade(p, accountId));
      const summary = onTradesImported(newTrades);
      const skipNote = summary.skipped > 0 ? `, ${summary.skipped} de outros meses ignoradas` : '';
      const dupNote = summary.duplicates > 0 ? `, ${summary.duplicates} ignoradas por duplicidade` : '';
      importMessage = `${summary.added} operações de ${monthNames[month - 1]} importadas${skipNote}${dupNote}.`;
    } catch (err) {
      importError = err instanceof Error ? err.message : 'Falha ao ler o relatório.';
    } finally {
      importing = false;
    }
  }

  function exportCsv(): void {
    const csv = tradesToCsv(monthTrades);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operacoes_${monthKey}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
</script>

<div class="drilldown-container">
  <div class="header">
    <button class="back-btn" on:click={onBack} aria-label="Voltar">
      ← Voltar
    </button>
    <h2 class="title">{monthNames[month - 1]} {year}</h2>
    <div class="header-actions">
      <button class="action-btn action-primary" on:click={onNewTrade}>
        + Nova operação
      </button>
      <button class="action-btn action-danger" on:click={onWithdrawRequest}>
        − Saque
      </button>
      <button
        class="action-btn"
        on:click={() => fileInput.click()}
        disabled={importing || !accountId}
        title={!accountId ? 'Crie uma conta antes de importar' : 'Importar relatório HTML do MT5'}
      >
        {importing ? 'Importando...' : 'Importar MT5'}
      </button>
      <button class="action-btn" on:click={exportCsv} disabled={monthTrades.length === 0}>
        Exportar CSV
      </button>
    </div>
  </div>
  <input
    type="file"
    accept=".html,.htm"
    bind:this={fileInput}
    on:change={handleFileSelected}
    class="file-input"
    aria-label="Importar relatório HTML do MT5"
  />

  {#if importMessage}
    <div class="alert alert-success" role="status">{importMessage}</div>
  {/if}
  {#if importError}
    <div class="alert alert-error" role="alert">⚠️ {importError}</div>
  {/if}

  {#if effectiveMetrics}
    <div class="metrics-summary">
      <div class="metric-card">
        <span class="metric-label">Total de Operações</span>
        <span class="metric-value">{effectiveMetrics.num_trades}</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Taxa de Ganho</span>
        <span class="metric-value {parseNum(effectiveMetrics.win_rate) >= 50 ? 'positive' : 'negative'}">
          {formatMoney(effectiveMetrics.win_rate)}%
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-label">P&L do Mês</span>
        <span class="metric-value {parseNum(effectiveMetrics.pnl_abs) >= 0 ? 'positive' : 'negative'}">
          {formatMoney(effectiveMetrics.pnl_abs)}
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Profit Factor</span>
        <span class="metric-value">{effectiveMetrics.profit_factor !== null ? formatMoney(effectiveMetrics.profit_factor) : '-'}</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Drawdown Máximo</span>
        <span class="metric-value negative">{formatMoney(effectiveMetrics.max_drawdown_pct)}%</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Taxas Pagas</span>
        <span class="metric-value">{formatMoney(String(totalFees))}</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Saques</span>
        <span class="metric-value">{formatMoney(String(totalWithdrawn))}</span>
      </div>
    </div>
  {/if}

  <div class="trades-section">
    <h3 class="section-title">Operações do Mês ({monthTrades.length})</h3>

    {#if monthTrades.length > 0}
      <div class="trades-table-container">
        <table class="trades-table" role="table">
          <thead>
            <tr role="row">
              <th role="columnheader">Fechamento</th>
              <th role="columnheader">Ativo</th>
              <th role="columnheader">Dir</th>
              <th role="columnheader">Lotes</th>
              <th role="columnheader">Entrada</th>
              <th role="columnheader">Stop</th>
              <th role="columnheader">TP</th>
              <th role="columnheader">Saída</th>
              <th role="columnheader">Taxas</th>
              <th role="columnheader">P&L</th>
              <th role="columnheader">Status</th>
              <th role="columnheader">Ações</th>
            </tr>
          </thead>
          <tbody>
            {#each monthTrades as trade (trade.id)}
              <tr role="row">
                <td role="cell">{formatDate(trade.closed_at ?? trade.planned_at)}</td>
                <td role="cell" class="symbol-cell">{trade.symbol}</td>
                <td role="cell">
                  <span class="badge {trade.side === 'compra' ? 'badge-long' : 'badge-short'}">
                    {trade.side === 'compra' ? 'LONG' : 'SHORT'}
                  </span>
                </td>
                <td role="cell">{trade.lots}</td>
                <td role="cell">{trade.entry}</td>
                <td role="cell">{trade.stop || '-'}</td>
                <td role="cell">{trade.take ?? '-'}</td>
                <td role="cell">{trade.exit ?? '-'}</td>
                <td role="cell">{trade.fees}</td>
                <td
                  role="cell"
                  class="pnl-cell {parseNum(trade.pnl_ccy) >= 0 ? 'positive' : 'negative'}"
                >
                  {formatMoney(trade.pnl_ccy)}
                </td>
                <td role="cell">
                  <span class="badge {trade.status === 'fechado' ? 'badge-closed' : 'badge-open'}">
                    {trade.status.toUpperCase()}
                  </span>
                </td>
                <td role="cell">
                  <div class="row-actions">
                    <button class="row-btn" on:click={() => onEditTrade(trade)}>Editar</button>
                    <button class="row-btn row-btn-danger" on:click={() => confirmDelete(trade)}>Excluir</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="empty-message">Nenhuma operação neste mês. Use "Importar MT5" para trazer o relatório.</p>
    {/if}
  </div>

  <div class="trades-section">
    <h3 class="section-title">Saques do Mês ({monthWithdrawals.length})</h3>

    {#if monthWithdrawals.length > 0}
      <div class="withdraw-list">
        {#each monthWithdrawals as w (w.id)}
          <div class="withdraw-row">
            <span class="withdraw-date">{formatDate(w.date)}</span>
            <span class="withdraw-amount">−{formatMoney(w.amount)}</span>
            <button
              class="row-btn row-btn-danger"
              on:click={() => {
                if (window.confirm(`Excluir saque de ${formatMoney(w.amount)} em ${formatDate(w.date)}?`)) {
                  onDeleteWithdrawal(w.id);
                }
              }}
            >
              Excluir
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty-message">Nenhum saque neste mês.</p>
    {/if}
  </div>
</div>

<style>
  .drilldown-container {
    padding: 1.25rem 1.5rem;
    background-color: #09090b;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 4px;
    color: #e4e4e7;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .back-btn {
    padding: 0.4rem 0.8rem;
    background-color: transparent;
    color: #a1a1aa;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    transition: color 0.15s, border-color 0.15s, background-color 0.15s;
  }

  .back-btn:hover {
    color: #fafafa;
    border-color: rgba(255, 255, 255, 0.25);
    background-color: rgba(255, 255, 255, 0.04);
  }

  .back-btn:focus {
    outline: 1px solid #22d3ee;
    outline-offset: 1px;
  }

  .title {
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #fafafa;
    margin: 0;
    margin-right: auto;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.4rem 0.8rem;
    background-color: #131318;
    color: #e4e4e7;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 550;
    transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
  }

  .action-btn:hover:not(:disabled) {
    border-color: rgba(34, 211, 238, 0.5);
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.12);
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .action-btn.action-primary {
    background-color: rgba(34, 197, 94, 0.12);
    border-color: rgba(34, 197, 94, 0.45);
    color: #4ade80;
  }

  .action-btn.action-primary:hover:not(:disabled) {
    background-color: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.7);
    box-shadow: 0 0 14px rgba(34, 197, 94, 0.25);
  }

  .action-btn.action-danger {
    background-color: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.4);
    color: #f87171;
  }

  .action-btn.action-danger:hover:not(:disabled) {
    background-color: rgba(239, 68, 68, 0.18);
    border-color: rgba(239, 68, 68, 0.65);
    box-shadow: 0 0 14px rgba(239, 68, 68, 0.22);
  }

  .withdraw-list {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 3px;
  }

  .withdraw-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.45rem 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.78rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .withdraw-row:last-child {
    border-bottom: none;
  }

  .withdraw-date {
    color: #a1a1aa;
  }

  .withdraw-amount {
    color: #f87171;
    font-weight: 650;
    margin-right: auto;
  }

  .row-actions {
    display: flex;
    gap: 0.5rem;
  }

  .row-btn {
    padding: 0.2rem 0.55rem;
    background-color: transparent;
    color: #a1a1aa;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.72rem;
    font-weight: 550;
    transition: color 0.15s, border-color 0.15s, background-color 0.15s;
  }

  .row-btn:hover {
    color: #fafafa;
    border-color: rgba(255, 255, 255, 0.3);
    background-color: rgba(255, 255, 255, 0.05);
  }

  .row-btn-danger {
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.35);
  }

  .row-btn-danger:hover {
    color: #fecaca;
    border-color: rgba(239, 68, 68, 0.7);
    background-color: rgba(239, 68, 68, 0.1);
  }

  .file-input {
    display: none;
  }

  .alert {
    padding: 0.6rem 0.8rem;
    border-radius: 3px;
    margin-bottom: 1rem;
    font-size: 0.8rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .alert-error {
    background-color: rgba(239, 68, 68, 0.08);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.35);
  }

  .alert-success {
    background-color: rgba(34, 197, 94, 0.08);
    color: #86efac;
    border: 1px solid rgba(34, 197, 94, 0.35);
  }

  .metrics-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.6rem;
    margin-bottom: 1.25rem;
  }

  .metric-card {
    padding: 0.7rem 0.85rem;
    background: linear-gradient(180deg, #101014 0%, #0c0c10 100%);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 18px rgba(34, 211, 238, 0.05);
  }

  .metric-label {
    font-size: 0.62rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .metric-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 1.2rem;
    font-weight: 650;
    color: #fafafa;
    font-variant-numeric: tabular-nums;
  }

  .metric-value.positive {
    color: #4ade80;
    text-shadow: 0 0 14px rgba(34, 197, 94, 0.45);
  }

  .metric-value.negative {
    color: #f87171;
    text-shadow: 0 0 14px rgba(239, 68, 68, 0.45);
  }

  .section-title {
    font-size: 0.72rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #a1a1aa;
    margin-top: 0;
    margin-bottom: 0.6rem;
  }

  .trades-table-container {
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 3px;
  }

  .trades-table {
    width: 100%;
    border-collapse: collapse;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.76rem;
    font-variant-numeric: tabular-nums;
  }

  .trades-table thead {
    background-color: #101014;
  }

  .trades-table th {
    padding: 0.45rem 0.6rem;
    text-align: left;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 0.62rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #71717a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    white-space: nowrap;
  }

  .trades-table td {
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #d4d4d8;
    white-space: nowrap;
  }

  .trades-table tbody tr {
    transition: background-color 0.12s ease;
  }

  .trades-table tbody tr:hover {
    background-color: rgba(34, 211, 238, 0.06);
    box-shadow: inset 2px 0 0 #22d3ee;
  }

  .symbol-cell {
    color: #fafafa;
    font-weight: 650;
  }

  .pnl-cell {
    font-weight: 650;
  }

  .pnl-cell.positive {
    color: #4ade80;
  }

  .pnl-cell.negative {
    color: #f87171;
  }

  .badge {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    border-radius: 3px;
    border: 1px solid transparent;
  }

  .badge-long {
    color: #4ade80;
    background-color: rgba(34, 197, 94, 0.12);
    border-color: rgba(34, 197, 94, 0.4);
  }

  .badge-short {
    color: #f87171;
    background-color: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .badge-closed {
    color: #a1a1aa;
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .badge-open {
    color: #22d3ee;
    background-color: rgba(34, 211, 238, 0.1);
    border-color: rgba(34, 211, 238, 0.4);
  }

  .empty-message {
    padding: 1.5rem;
    text-align: center;
    color: #71717a;
    font-size: 0.82rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  @media (max-width: 768px) {
    .drilldown-container {
      padding: 0.9rem;
    }

    .metrics-summary {
      grid-template-columns: repeat(2, 1fr);
    }

    .trades-table th,
    .trades-table td {
      padding: 0.35rem 0.45rem;
    }
  }
</style>
