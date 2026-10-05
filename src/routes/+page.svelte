<script lang="ts">
  import YearCalendar from '$components/YearCalendar.svelte';
  import TradeSizingForm from '$components/TradeSizingForm.svelte';
  import MonthlyDrilldown from '$components/MonthlyDrilldown.svelte';
  import type { MonthMetrics, Trade } from '$lib/types';

  let currentTab: 'dashboard' | 'calculator' | 'drilldown' = 'dashboard';
  let selectedMonth: number | null = null;
  let selectedYear: number = new Date().getFullYear();

  // Mock data para demonstração
  const mockMonthsData: MonthMetrics[] = [
    {
      month: 1,
      year: 2024,
      totalTrades: 12,
      winningTrades: 8,
      losingTrades: 4,
      winRate: 66.7,
      totalPnL: 850.5,
      averageRiskRewardRatio: 1.8,
      maxDrawdown: 5.2,
    },
    {
      month: 2,
      year: 2024,
      totalTrades: 10,
      winningTrades: 4,
      losingTrades: 6,
      winRate: 40.0,
      totalPnL: -320.0,
      averageRiskRewardRatio: 0.9,
      maxDrawdown: 8.5,
    },
    {
      month: 3,
      year: 2024,
      totalTrades: 15,
      winningTrades: 10,
      losingTrades: 5,
      winRate: 66.7,
      totalPnL: 1200.0,
      averageRiskRewardRatio: 2.1,
      maxDrawdown: 3.1,
    },
    {
      month: 4,
      year: 2024,
      totalTrades: 8,
      winningTrades: 5,
      losingTrades: 3,
      winRate: 62.5,
      totalPnL: 450.0,
      averageRiskRewardRatio: 1.5,
      maxDrawdown: 4.0,
    },
  ];

  // Mock trades para drill-down
  const mockTrades: Trade[] = [
    {
      id: '1',
      instrument: 'XAUUSD',
      entry: 2050.00,
      stop: 2045.00,
      takeProfit: 2060.00,
      date: new Date(2024, 0, 5),
      pnl: 150.00,
      riskPercentage: 2.0,
      lotSize: 0.1,
    },
    {
      id: '2',
      instrument: 'BTCUSD',
      entry: 42500.00,
      stop: 42000.00,
      takeProfit: 43500.00,
      date: new Date(2024, 0, 8),
      pnl: -100.00,
      riskPercentage: 2.0,
      lotSize: 0.05,
    },
    {
      id: '3',
      instrument: 'XAUUSD',
      entry: 2055.00,
      stop: 2050.00,
      takeProfit: 2065.00,
      date: new Date(2024, 0, 12),
      pnl: 200.00,
      riskPercentage: 2.0,
      lotSize: 0.12,
    },
  ];

  function handleMonthClick(month: number, year: number): void {
    selectedMonth = month;
    selectedYear = year;
    currentTab = 'drilldown';
  }

  function handleBackFromDrilldown(): void {
    currentTab = 'dashboard';
    selectedMonth = null;
  }
</script>

<svelte:head>
  <title>Gerenciador de Risco - XAUUSD/BTCUSD</title>
</svelte:head>

<main class="app-container">
  <header class="app-header">
    <div class="header-content">
      <h1 class="app-title">💰 Gerenciador de Risco</h1>
      <p class="app-subtitle">XAUUSD / BTCUSD - Análise de Operações</p>
    </div>
  </header>

  <div class="tab-navigation">
    <button
      class="tab-button {currentTab === 'dashboard' ? 'active' : ''}"
      on:click={() => (currentTab = 'dashboard')}
      aria-current={currentTab === 'dashboard' ? 'page' : undefined}
    >
      📊 Dashboard
    </button>
    <button
      class="tab-button {currentTab === 'calculator' ? 'active' : ''}"
      on:click={() => (currentTab = 'calculator')}
      aria-current={currentTab === 'calculator' ? 'page' : undefined}
    >
      🧮 Calculadora
    </button>
  </div>

  <div class="content">
    {#if currentTab === 'dashboard'}
      <section class="tab-content" aria-label="Dashboard anual">
        <YearCalendar
          year={selectedYear}
          monthsData={mockMonthsData}
          onMonthClick={handleMonthClick}
        />
      </section>
    {/if}

    {#if currentTab === 'calculator'}
      <section class="tab-content" aria-label="Calculadora de posicionamento">
        <TradeSizingForm />
      </section>
    {/if}

    {#if currentTab === 'drilldown' && selectedMonth !== null}
      <section class="tab-content" aria-label="Detalhes mensais">
        <MonthlyDrilldown
          month={selectedMonth}
          year={selectedYear}
          trades={mockTrades}
          metrics={mockMonthsData.find((m) => m.month === selectedMonth) || null}
          onBack={handleBackFromDrilldown}
        />
      </section>
    {/if}
  </div>

  <footer class="app-footer">
    <p>
      Gerenciador de Risco v0.0.1 • Desenvolvido com Rust + Tauri + SvelteKit
    </p>
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
      'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
      'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: #f3f4f6;
  }

  .app-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .app-title {
    font-size: 2rem;
    margin: 0;
    font-weight: 700;
  }

  .app-subtitle {
    font-size: 0.95rem;
    margin: 0.5rem 0 0 0;
    opacity: 0.9;
  }

  .tab-navigation {
    background-color: white;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    gap: 0;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    padding: 0 2rem;
  }

  .tab-button {
    padding: 1rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    color: #6b7280;
    transition: all 0.2s;
  }

  .tab-button:hover {
    color: #1f2937;
    background-color: #f9fafb;
  }

  .tab-button.active {
    color: #667eea;
    border-bottom-color: #667eea;
  }

  .tab-button:focus {
    outline: 2px solid #667eea;
    outline-offset: -2px;
  }

  .content {
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    padding: 2rem;
  }

  .tab-content {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .app-footer {
    background-color: #1f2937;
    color: #d1d5db;
    text-align: center;
    padding: 1.5rem;
    margin-top: auto;
    font-size: 0.875rem;
  }

  .app-footer p {
    margin: 0;
  }

  @media (max-width: 768px) {
    .app-header {
      padding: 1.5rem;
    }

    .app-title {
      font-size: 1.5rem;
    }

    .app-subtitle {
      font-size: 0.85rem;
    }

    .tab-navigation {
      padding: 0 1rem;
    }

    .tab-button {
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
    }

    .content {
      padding: 1rem;
    }
  }

  @media (prefers-color-scheme: dark) {
    .app-container {
      background-color: #111827;
    }

    .tab-navigation {
      background-color: #1f2937;
      border-bottom-color: #374151;
    }

    .tab-button {
      color: #9ca3af;
    }

    .tab-button:hover {
      color: #f9fafb;
      background-color: #374151;
    }

    .tab-button.active {
      color: #a5b4fc;
      border-bottom-color: #a5b4fc;
    }
  }
</style>
