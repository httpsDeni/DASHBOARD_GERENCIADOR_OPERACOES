<script lang="ts">
  import type { MonthlyStatsDto, TradeDto, Withdrawal } from '$lib/types';
  import { summarizeYear, monthWithdrawals } from '$lib/stats';
  import AnimatedNumber from '$components/AnimatedNumber.svelte';

  export let year: number = new Date().getFullYear();
  export let monthsData: MonthlyStatsDto[] = [];
  export let trades: TradeDto[] = [];
  export let withdrawals: Withdrawal[] = [];
  export let balance: string = '';

  function monthKey(month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  export let onMonthClick: (month: number, year: number) => void = () => {};
  export let onYearChange: (year: number) => void = () => {};

  function parseNum(value: string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    const n = parseFloat(String(value).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  // Backend assume quando tem operações; senão agrega as operações locais do ano
  $: localYear = summarizeYear(trades, year, balance);
  $: effectiveMonths = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const backend = monthsData.find((d) => d.month === m && d.year === year);
    return backend && backend.num_trades > 0 ? backend : localYear[i];
  });
  $: maxAbsPnl = Math.max(1, ...effectiveMonths.map((d) => Math.abs(parseNum(d.pnl_abs))));

  type MonthResult = 'positive' | 'negative' | 'breakeven' | 'empty';

  function getMonthStats(month: number): MonthlyStatsDto {
    return effectiveMonths[month - 1];
  }

  function getMonthResult(month: number): MonthResult {
    const data = getMonthStats(month);
    if (data.num_trades === 0) return 'empty';
    const pnl = parseNum(data.pnl_abs);
    if (pnl > 0) return 'positive';
    if (pnl < 0) return 'negative';
    return 'breakeven';
  }

  function formatSigned(value: string | null | undefined): string {
    return formatSignedNum(parseNum(value));
  }

  function formatSignedNum(n: number): string {
    const abs = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${n > 0 ? '+' : n < 0 ? '-' : ''}${abs}`;
  }

  function isCurrentMonth(month: number): boolean {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  }

  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  // Fundo escuro com véu da cor do resultado; intensidade pelo maior P&L do ano
  function getColorForMonth(month: number): string {
    const result = getMonthResult(month);
    if (result === 'empty') return '#0c0c10';
    if (result === 'breakeven') return 'rgba(251, 191, 36, 0.08)';
    const intensity = Math.min(1, Math.abs(parseNum(getMonthStats(month).pnl_abs)) / maxAbsPnl);
    const alpha = (0.07 + intensity * 0.16).toFixed(3);
    if (result === 'negative') return `rgba(239, 68, 68, ${alpha})`;
    return `rgba(34, 197, 94, ${alpha})`;
  }

  function getResultLabel(result: MonthResult): string {
    if (result === 'positive') return 'Mês positivo';
    if (result === 'negative') return 'Mês negativo';
    if (result === 'breakeven') return 'Mês empatado';
    return 'Sem dados';
  }

  function getMetricsTooltip(month: number): string {
    const data = getMonthStats(month);
    if (data.num_trades === 0) return 'Sem dados';

    return `${monthNames[month - 1]} ${year}
Trades: ${data.num_trades}
Taxa de ganho: ${parseNum(data.win_rate).toFixed(1)}%
P&L: ${formatSigned(data.pnl_abs)}
Drawdown Máx: ${parseNum(data.max_drawdown_pct).toFixed(2)}%`;
  }
</script>

<div class="year-calendar">
  <div class="calendar-header">
    <button class="year-nav" on:click={() => onYearChange(year - 1)} aria-label="Ano anterior">‹</button>
    <h2 class="calendar-title">{year}</h2>
    <button class="year-nav" on:click={() => onYearChange(year + 1)} aria-label="Próximo ano">›</button>
  </div>
  
  <div class="months-grid" role="grid" aria-label="Heatmap anual de operações por mês">
    {#each Array.from({ length: 12 }, (_, i) => i + 1) as month, i}
      {@const stats = getMonthStats(month)}
      {@const result = getMonthResult(month)}
      {@const bgColor = getColorForMonth(month)}
      {@const withdrawn = monthWithdrawals(withdrawals, monthKey(month))}
      <button
        class="month-tile"
        class:current-month={isCurrentMonth(month)}
        class:tile-positive={result === 'positive'}
        class:tile-negative={result === 'negative'}
        class:tile-breakeven={result === 'breakeven'}
        style:background-color={bgColor}
        style:animation-delay={`${i * 45}ms`}
        on:click={() => onMonthClick(month, year)}
        title={getMetricsTooltip(month)}
        aria-label="{monthNames[month - 1]} {year}: {getResultLabel(result)}{result !== 'empty' ? `, P&L ${formatSigned(stats.pnl_abs)}` : ''}"
        aria-current={isCurrentMonth(month) ? 'date' : undefined}
        role="gridcell"
      >
        <div class="month-header">
          {monthNames[month - 1]}
        </div>

        {#if withdrawn > 0}
          <div class="withdraw-badge" title="Total sacado no mês">
            <span class="withdraw-badge-label">SAQUE</span>
            <span class="withdraw-badge-value">
              {withdrawn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        {/if}

        {#if result !== 'empty'}
          <div class="month-pnl {result}">
            {#if result === 'positive'}
              <span aria-hidden="true">▲</span>
            {:else if result === 'negative'}
              <span aria-hidden="true">▼</span>
            {:else}
              <span aria-hidden="true">▬</span>
            {/if}
            <AnimatedNumber value={parseNum(stats.pnl_abs)} format={formatSignedNum} />
          </div>

          <div class="metrics-small">
            <div class="metric-item">
              {stats.num_trades} trades • {parseNum(stats.win_rate).toFixed(0)}%
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
      <span>Mês negativo (prejuízo)</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style:background-color="rgb(34, 197, 94)"></span>
      <span>Mês positivo (lucro)</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style:background-color="#fef3c7"></span>
      <span>Mês empatado</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style:background-color="#e5e7eb"></span>
      <span>Sem dados</span>
    </div>
  </div>
</div>

<style>
  .year-calendar {
    padding: 1.25rem 1.5rem;
    background-color: #09090b;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 4px;
  }

  .calendar-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .calendar-title {
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    margin: 0;
    color: #fafafa;
    font-variant-numeric: tabular-nums;
    min-width: 4.5rem;
    text-align: center;
  }

  .year-nav {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    line-height: 1;
    color: #a1a1aa;
    background-color: #131318;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, box-shadow 0.15s;
  }

  .year-nav:hover {
    color: #22d3ee;
    border-color: rgba(34, 211, 238, 0.55);
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.15);
  }

  .months-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.6rem;
    margin-bottom: 1.25rem;
  }

  .month-tile {
    position: relative;
    padding: 0.85rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 3px;
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.2s, background-color 0.6s ease;
    text-align: center;
    font-family: inherit;
    background-color: inherit;
    min-height: 118px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    animation: tile-in 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) both;
  }

  @keyframes tile-in {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .month-tile:hover {
    transform: translateY(-3px);
    border-color: rgba(34, 211, 238, 0.55);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(34, 211, 238, 0.12);
  }

  .month-tile.tile-positive {
    border-color: rgba(34, 197, 94, 0.35);
  }

  .month-tile.tile-positive:hover {
    border-color: rgba(34, 197, 94, 0.7);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 18px rgba(34, 197, 94, 0.22);
  }

  .month-tile.tile-negative {
    border-color: rgba(239, 68, 68, 0.35);
  }

  .month-tile.tile-negative:hover {
    border-color: rgba(239, 68, 68, 0.7);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 18px rgba(239, 68, 68, 0.22);
  }

  .month-tile.tile-breakeven {
    border-color: rgba(251, 191, 36, 0.3);
  }

  .month-tile.current-month {
    border: 1px solid rgba(34, 211, 238, 0.65);
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.18);
  }

  @media (prefers-reduced-motion: reduce) {
    .month-tile {
      animation: none;
      transition: none;
    }
  }

  .month-tile:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .month-tile:active {
    transform: translateY(0);
  }

  .month-header {
    font-weight: 650;
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #a1a1aa;
    margin-bottom: 0.5rem;
  }

  .withdraw-badge {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    padding: 0.15rem 0.45rem;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(217, 119, 6, 0.22));
    border: 1px solid rgba(251, 191, 36, 0.55);
    border-radius: 3px;
    box-shadow: 0 0 12px rgba(251, 191, 36, 0.25), inset 0 1px 0 rgba(253, 230, 138, 0.25);
  }

  .withdraw-badge-label {
    font-size: 0.56rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: #fde68a;
  }

  .withdraw-badge-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.66rem;
    font-weight: 700;
    color: #fef3c7;
    font-variant-numeric: tabular-nums;
  }

  .month-pnl {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 1.2rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    margin-bottom: 0.5rem;
    color: #fafafa;
    font-variant-numeric: tabular-nums;
  }

  .month-pnl.positive {
    color: #4ade80;
    text-shadow: 0 0 16px rgba(34, 197, 94, 0.5);
  }

  .month-pnl.negative {
    color: #f87171;
    text-shadow: 0 0 16px rgba(239, 68, 68, 0.5);
  }

  .month-pnl.breakeven {
    color: #fbbf24;
  }

  .metrics-small {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.68rem;
    color: #71717a;
    line-height: 1.3;
  }

  .metric-item {
    margin-top: 0.25rem;
  }

  .no-data {
    color: #52525b;
    font-size: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .legend {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    padding-top: 0.9rem;
    border-top: 1px solid rgba(255, 255, 255, 0.09);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.72rem;
    color: #a1a1aa;
  }

  .legend-color {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 768px) {
    .year-calendar {
      padding: 0.9rem;
    }

    .months-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .month-tile {
      min-height: 100px;
      padding: 0.65rem 0.5rem;
    }

    .month-pnl {
      font-size: 1rem;
    }

    .legend {
      gap: 1rem;
      font-size: 0.7rem;
    }
  }
</style>
