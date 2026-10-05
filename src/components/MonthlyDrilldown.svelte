<script lang="ts">
  import type { Trade, MonthMetrics } from '$lib/types';

  export let month: number = new Date().getMonth() + 1;
  export let year: number = new Date().getFullYear();
  export let trades: Trade[] = [];
  export let metrics: MonthMetrics | null = null;
  export let onBack: () => void = () => {};

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }
</script>

<div class="drilldown-container">
  <div class="header">
    <button class="back-btn" on:click={onBack} aria-label="Voltar">
      ← Voltar
    </button>
    <h2 class="title">{monthNames[month - 1]} {year}</h2>
  </div>

  {#if metrics}
    <div class="metrics-summary">
      <div class="metric-card">
        <span class="metric-label">Total de Operações</span>
        <span class="metric-value">{metrics.totalTrades}</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Taxa de Ganho</span>
        <span class="metric-value {metrics.winRate >= 50 ? 'positive' : 'negative'}">
          {metrics.winRate.toFixed(1)}%
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Ganhos/Perdas</span>
        <span class="metric-value {metrics.totalPnL >= 0 ? 'positive' : 'negative'}">
          {formatCurrency(metrics.totalPnL)}
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Razão RF Média</span>
        <span class="metric-value">{metrics.averageRiskRewardRatio.toFixed(2)}</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Drawdown Máximo</span>
        <span class="metric-value negative">{metrics.maxDrawdown.toFixed(2)}%</span>
      </div>
    </div>
  {/if}

  <div class="trades-section">
    <h3 class="section-title">Operações do Mês</h3>

    {#if trades && trades.length > 0}
      <div class="trades-table-container">
        <table class="trades-table" role="table">
          <thead>
            <tr role="row">
              <th role="columnheader">Instrumento</th>
              <th role="columnheader">Entry</th>
              <th role="columnheader">Stop</th>
              <th role="columnheader">TP</th>
              <th role="columnheader">Data</th>
              <th role="columnheader">Lotes</th>
              <th role="columnheader">Risco (%)</th>
              <th role="columnheader">P&L</th>
            </tr>
          </thead>
          <tbody>
            {#each trades as trade (trade.id)}
              <tr role="row">
                <td role="cell">{trade.instrument}</td>
                <td role="cell">{trade.entry.toFixed(2)}</td>
                <td role="cell">{trade.stop.toFixed(2)}</td>
                <td role="cell">{trade.takeProfit?.toFixed(2) || '-'}</td>
                <td role="cell">{formatDate(trade.date)}</td>
                <td role="cell">{trade.lotSize.toFixed(4)}</td>
                <td role="cell">{trade.riskPercentage.toFixed(2)}%</td>
                <td
                  role="cell"
                  class="pnl-cell {(trade.pnl ?? 0) >= 0 ? 'positive' : 'negative'}"
                >
                  {formatCurrency(trade.pnl ?? 0)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="empty-message">Nenhuma operação registrada para este mês.</p>
    {/if}
  </div>
</div>

<style>
  .drilldown-container {
    padding: 2rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .back-btn {
    padding: 0.5rem 1rem;
    background-color: #e5e7eb;
    color: #1f2937;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .back-btn:hover {
    background-color: #d1d5db;
  }

  .back-btn:focus {
    outline: 2px solid #6b7280;
    outline-offset: 2px;
  }

  .title {
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
    margin: 0;
  }

  .metrics-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .metric-card {
    padding: 1rem;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .metric-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .metric-value {
    font-size: 1.25rem;
    font-weight: bold;
    color: #1f2937;
  }

  .metric-value.positive {
    color: #16a34a;
  }

  .metric-value.negative {
    color: #dc2626;
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .trades-table-container {
    overflow-x: auto;
  }

  .trades-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .trades-table thead {
    background-color: #f3f4f6;
  }

  .trades-table th {
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
  }

  .trades-table td {
    padding: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
    color: #1f2937;
  }

  .trades-table tbody tr:hover {
    background-color: #f9fafb;
  }

  .pnl-cell {
    font-weight: 600;
  }

  .pnl-cell.positive {
    color: #16a34a;
  }

  .pnl-cell.negative {
    color: #dc2626;
  }

  .empty-message {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    font-style: italic;
  }

  @media (max-width: 768px) {
    .drilldown-container {
      padding: 1rem;
    }

    .metrics-summary {
      grid-template-columns: repeat(2, 1fr);
    }

    .trades-table-container {
      font-size: 0.75rem;
    }

    .trades-table th,
    .trades-table td {
      padding: 0.5rem;
    }
  }

  @media (prefers-color-scheme: dark) {
    .drilldown-container {
      background-color: #1f2937;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .title {
      color: #f9fafb;
    }

    .back-btn {
      background-color: #374151;
      color: #f9fafb;
    }

    .back-btn:hover {
      background-color: #4b5563;
    }

    .metric-card {
      background-color: #374151;
      border-color: #4b5563;
    }

    .metric-label {
      color: #d1d5db;
    }

    .metric-value {
      color: #f9fafb;
    }

    .section-title {
      color: #f9fafb;
    }

    .trades-table thead {
      background-color: #374151;
    }

    .trades-table th {
      color: #d1d5db;
      border-bottom-color: #4b5563;
    }

    .trades-table td {
      color: #f9fafb;
      border-bottom-color: #4b5563;
    }

    .trades-table tbody tr:hover {
      background-color: #374151;
    }

    .empty-message {
      color: #d1d5db;
    }
  }
</style>
