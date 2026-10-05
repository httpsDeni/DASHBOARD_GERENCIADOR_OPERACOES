<script lang="ts">
  import type { MonthMetrics } from '$lib/types';

  export let year: number = new Date().getFullYear();
  export let monthsData: MonthMetrics[] = [];
  export let onMonthClick: (month: number, year: number) => void = () => {};

  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  // Calcula estatísticas para normalização (percentil 95)
  function getColorScale(winRate: number | null, maxWinRate: number): string {
    if (winRate === null || winRate === undefined) {
      return '#e5e7eb'; // Cinza neutro para sem dados
    }

    // Escala divergente: -1 (vermelho) a +1 (verde)
    const normalized = (winRate - 50) / 50; // Centraliza em 50%
    const clamped = Math.max(-1, Math.min(1, normalized));

    if (clamped < 0) {
      // Vermelho (perda)
      const intensity = Math.abs(clamped);
      const r = 239;
      const g = Math.round(68 - intensity * 68);
      const b = Math.round(68 - intensity * 68);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (clamped > 0) {
      // Verde (ganho)
      const intensity = clamped;
      const r = Math.round(34 - intensity * 34);
      const g = 197;
      const b = Math.round(94 - intensity * 94);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Neutro (50% win rate)
      return '#f0f0f0';
    }
  }

  function getWinRateForMonth(month: number): number | null {
    const data = monthsData.find(m => m.month === month);
    return data?.winRate ?? null;
  }

  function getMetricsTooltip(month: number): string {
    const data = monthsData.find(m => m.month === month);
    if (!data) return 'Sem dados';

    return `${monthNames[month - 1]} ${year}
Trades: ${data.totalTrades}
Taxa de ganho: ${data.winRate.toFixed(1)}%
P&L: ${data.totalPnL > 0 ? '+' : ''}${data.totalPnL.toFixed(2)}
Razão RF: ${data.averageRiskRewardRatio.toFixed(2)}
Drawdown Máx: ${data.maxDrawdown.toFixed(2)}%`;
  }
</script>

<div class="year-calendar">
  <h2 class="calendar-title">{year}</h2>
  
  <div class="months-grid" role="grid" aria-label="Heatmap anual de operações por mês">
    {#each Array.from({ length: 12 }, (_, i) => i + 1) as month}
      {@const winRate = getWinRateForMonth(month)}
      {@const bgColor = getColorScale(winRate, 100)}
      <button
        class="month-tile"
        style:background-color={bgColor}
        on:click={() => onMonthClick(month, year)}
        title={getMetricsTooltip(month)}
        aria-label="{monthNames[month - 1]} {year}: {winRate !== null ? winRate.toFixed(1) + '% taxa de ganho' : 'Sem dados'}"
        role="gridcell"
      >
        <div class="month-header">
          {monthNames[month - 1]}
        </div>
        
        {#if winRate !== null}
          <div class="win-rate">
            {#if winRate >= 50}
              <span aria-label="Taxa de ganho acima de 50%">▲</span>
            {:else}
              <span aria-label="Taxa de ganho abaixo de 50%">▼</span>
            {/if}
            <span class="rate-value">{winRate.toFixed(0)}%</span>
          </div>
          
          <div class="metrics-small">
            <div class="metric-item">
              {@const trades = monthsData.find(m => m.month === month)?.totalTrades ?? 0}
              {trades} trades
            </div>
          </div>
        {:else}
          <div class="no-data">Sem dados</div>
        {/if}
      </button>
    {/each}
  </div>

  <div class="legend">
    <div class="legend-item">
      <span class="legend-color" style:background-color="rgb(239, 68, 68)"></span>
      <span>Taxa de ganho baixa (&lt; 50%)</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style:background-color="rgb(34, 197, 94)"></span>
      <span>Taxa de ganho alta (&gt; 50%)</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style:background-color="#e5e7eb"></span>
      <span>Sem dados</span>
    </div>
  </div>
</div>

<style>
  .year-calendar {
    padding: 2rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .calendar-title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1.5rem;
    color: #1f2937;
  }

  .months-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .month-tile {
    padding: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    text-align: center;
    font-family: inherit;
    background-color: inherit;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .month-tile:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    border-color: #3b82f6;
  }

  .month-tile:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .month-tile:active {
    transform: translateY(0);
  }

  .month-header {
    font-weight: 600;
    font-size: 0.95rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .win-rate {
    font-size: 1.25rem;
    font-weight: bold;
    color: #1f2937;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .rate-value {
    font-size: 1rem;
  }

  .metrics-small {
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.3;
  }

  .metric-item {
    margin-top: 0.25rem;
  }

  .no-data {
    color: #9ca3af;
    font-size: 0.875rem;
    font-style: italic;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .legend {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .legend-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid #d1d5db;
  }

  @media (max-width: 768px) {
    .year-calendar {
      padding: 1rem;
    }

    .months-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .month-tile {
      min-height: 100px;
      padding: 0.75rem;
    }

    .legend {
      gap: 1rem;
      font-size: 0.75rem;
    }
  }

  @media (prefers-color-scheme: dark) {
    .year-calendar {
      background-color: #1f2937;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .calendar-title {
      color: #f9fafb;
    }

    .month-tile {
      border-color: #374151;
    }

    .month-tile:hover {
      border-color: #60a5fa;
    }

    .month-header,
    .win-rate {
      color: #f9fafb;
    }

    .metrics-small,
    .legend-item {
      color: #d1d5db;
    }

    .no-data {
      color: #9ca3af;
    }

    .legend {
      border-top-color: #374151;
    }

    .legend-color {
      border-color: #4b5563;
    }
  }
</style>
