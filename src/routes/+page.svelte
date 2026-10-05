<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import YearCalendar from '$components/YearCalendar.svelte';
  import TradeSizingForm from '$components/TradeSizingForm.svelte';
  import MonthlyDrilldown from '$components/MonthlyDrilldown.svelte';
  import CreateAccountModal from '$components/CreateAccountModal.svelte';
  import PlanTradeModal from '$components/PlanTradeModal.svelte';
  import CloseTradeList from '$components/CloseTradeList.svelte';
  import type { MonthMetrics, TradeDto, AccountDto, YearlyStatsDto, MonthlyStatsDto } from '$lib/types';

  let currentTab: 'dashboard' | 'calculator' | 'plan-trade' | 'close-trade' | 'drilldown' = 'dashboard';
  let selectedMonth: number | null = null;
  let selectedYear: number = new Date().getFullYear();
  let createAccountModalOpen: boolean = true; // Abrir logo no inicio
  let planTradeModalOpen: boolean = false;

  // Estado da conta
  let currentAccount: AccountDto | null = null;
  let monthsData: MonthlyStatsDto[] = [];
  let trades: TradeDto[] = [];
  let loading: boolean = false;

  async function loadYearReport(): Promise<void> {
    if (!currentAccount) return;
    loading = true;
    try {
      const report = await invoke<YearlyStatsDto>('year_report', {
        account_id: currentAccount.id,
        year: selectedYear,
      });

      // Carregar dados mensais para cada mês do ano
      const allMonthsData: MonthlyStatsDto[] = [];
      for (let month = 1; month <= 12; month++) {
        try {
          const monthlyReport = await invoke<MonthlyStatsDto>('monthly_report', {
            account_id: currentAccount.id,
            year: selectedYear,
            month,
          });
          allMonthsData.push(monthlyReport);
        } catch {
          // Se falhar, adiciona placeholder com zeros
          allMonthsData.push({
            year: selectedYear,
            month,
            pnl_abs: '0',
            return_pct: '0',
            num_trades: 0,
            win_rate: '0',
            profit_factor: null,
            max_drawdown_pct: '0',
          });
        }
      }
      monthsData = allMonthsData;
    } catch (err) {
      console.error('Erro ao carregar relatório anual:', err);
    } finally {
      loading = false;
    }
  }

  async function loadMonthlyReport(month: number, year: number): Promise<void> {
    if (!currentAccount) return;
    loading = true;
    try {
      const report = await invoke<MonthlyStatsDto>('monthly_report', {
        account_id: currentAccount.id,
        year,
        month,
      });

      // Atualizar/inserir dados mensais reais no array
      const existingIndex = monthsData.findIndex(m => m.month === month && m.year === year);
      if (existingIndex >= 0) {
        // Atualizar entrada existente
        monthsData[existingIndex] = report;
      } else {
        // Adicionar nova entrada
        monthsData = [...monthsData, report];
      }
      monthsData = monthsData; // Trigger reactivity
    } catch (err) {
      console.error('Erro ao carregar relatório mensal:', err);
    } finally {
      loading = false;
    }
  }

  function handleAccountCreated(account: AccountDto): void {
    currentAccount = account;
    createAccountModalOpen = false;
    loadYearReport();
  }

  function handleMonthClick(month: number, year: number): void {
    selectedMonth = month;
    selectedYear = year;
    loadMonthlyReport(month, year);
    currentTab = 'drilldown';
  }

  function handleBackFromDrilldown(): void {
    currentTab = 'dashboard';
    selectedMonth = null;
  }

  function handleTradePlanned(trade: TradeDto): void {
    // Adicionar novo trade à lista
    trades = [trade, ...trades];
    // Recarregar relatórios para refletir o novo trade
    loadYearReport();
    if (selectedMonth !== null) {
      loadMonthlyReport(selectedMonth, selectedYear);
    }
  }

  function handleTradeClosed(trade: TradeDto): void {
    // Atualizar trade fechado na lista
    trades = trades.map(t => (t.id === trade.id ? trade : t));
    // Recarregar relatórios para refletir o P&L atualizado
    loadYearReport();
    if (selectedMonth !== null) {
      loadMonthlyReport(selectedMonth, selectedYear);
    }
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

  {#if !currentAccount}
    <div class="no-account-message">
      <p>Nenhuma conta selecionada. Crie uma nova conta para começar.</p>
      <button class="btn-create-account" on:click={() => (createAccountModalOpen = true)}>
        + Criar Conta
      </button>
    </div>
  {:else}
    <div class="tab-navigation">
      <div class="tabs-group">
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
        <button
          class="tab-button {currentTab === 'plan-trade' ? 'active' : ''}"
          on:click={() => (planTradeModalOpen = true)}
        >
          ➕ Planejar Trade
        </button>
        <button
          class="tab-button {currentTab === 'close-trade' ? 'active' : ''}"
          on:click={() => (currentTab = 'close-trade')}
        >
          🔚 Fechar Trades
        </button>
      </div>
      <div class="account-info">
        Conta: {currentAccount.id.substring(0, 8)}... | Saldo: {currentAccount.balance_inicial} {currentAccount.ccy}
      </div>
    </div>

    <div class="content">
      {#if currentTab === 'dashboard'}
        <section class="tab-content" aria-label="Dashboard anual">
          {#if loading}
            <div class="loading">Carregando dados...</div>
          {:else}
            <YearCalendar
              year={selectedYear}
              monthsData={monthsData}
              onMonthClick={handleMonthClick}
            />
          {/if}
        </section>
      {/if}

      {#if currentTab === 'calculator'}
        <section class="tab-content" aria-label="Calculadora de posicionamento">
          <TradeSizingForm />
        </section>
      {/if}

      {#if currentTab === 'close-trade'}
        <section class="tab-content" aria-label="Fechar trades">
          {#if loading}
            <div class="loading">Carregando dados...</div>
          {:else}
            <CloseTradeList
              {trades}
              accountId={currentAccount?.id || ''}
              onTradeClosed={handleTradeClosed}
            />
          {/if}
        </section>
      {/if}

      {#if currentTab === 'drilldown' && selectedMonth !== null}
        <section class="tab-content" aria-label="Detalhes mensais">
          {#if loading}
            <div class="loading">Carregando relatório mensal...</div>
          {:else}
            {@const selectedMonthData = monthsData.find((m) => m.month === selectedMonth)}
            {#if selectedMonthData}
              <MonthlyDrilldown
                month={selectedMonth}
                year={selectedYear}
                trades={trades}
                metrics={selectedMonthData}
                onBack={handleBackFromDrilldown}
              />
            {:else}
              <div class="no-data">Nenhum dado para este mês.</div>
            {/if}
          {/if}
        </section>
      {/if}
    </div>
  {/if}

  <CreateAccountModal isOpen={createAccountModalOpen} onAccountCreated={handleAccountCreated} />

  {#if currentAccount}
    <PlanTradeModal
      isOpen={planTradeModalOpen}
      accountId={currentAccount.id}
      balance={currentAccount.balance_inicial}
      onTradePlanned={handleTradePlanned}
    />
  {/if}

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

  .no-account-message {
    padding: 3rem 2rem;
    text-align: center;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin: 2rem auto;
    max-width: 600px;
  }

  .no-account-message p {
    font-size: 1.1rem;
    color: #6b7280;
    margin-bottom: 1.5rem;
  }

  .btn-create-account {
    padding: 0.75rem 2rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-create-account:hover {
    background-color: #2563eb;
  }

  .btn-create-account:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
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
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .tabs-group {
    display: flex;
    gap: 0;
    flex: 1;
  }

  .tab-button {
    padding: 1rem 1rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    color: #6b7280;
    transition: all 0.2s;
    white-space: nowrap;
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

  .account-info {
    margin-left: auto;
    font-size: 0.875rem;
    color: #6b7280;
    padding: 1rem 1.5rem;
    border-left: 1px solid #e5e7eb;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
    font-size: 1rem;
  }

  .no-data {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
    font-size: 1rem;
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

    .no-account-message {
      background-color: #1f2937;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .no-account-message p {
      color: #d1d5db;
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

    .account-info {
      color: #d1d5db;
      border-left-color: #374151;
    }

    .loading,
    .no-data {
      color: #d1d5db;
    }
  }
</style>
