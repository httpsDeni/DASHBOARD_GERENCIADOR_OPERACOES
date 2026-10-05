<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { onMount, onDestroy } from 'svelte';
  import { saveAccount, loadAccount } from '$lib/account-storage';
  import { saveTrades, loadTrades } from '$lib/trade-storage';
  import { saveWithdrawals, loadWithdrawals } from '$lib/withdrawal-storage';
  import { computeCurrentBalance } from '$lib/stats';
  import { formatBalance } from '$lib/format';
  import WithdrawModal from '$components/WithdrawModal.svelte';

  // SvelteKit injeta params na página (evita warning de prop desconhecida no dev)
  export let params: Record<string, string> = {};
  import YearCalendar from '$components/YearCalendar.svelte';
  import TradeSizingForm from '$components/TradeSizingForm.svelte';
  import MonthlyDrilldown from '$components/MonthlyDrilldown.svelte';
  import CreateAccountModal from '$components/CreateAccountModal.svelte';
  import PlanTradeModal from '$components/PlanTradeModal.svelte';
  import { tradeDedupeKey, filterTradesByMonth } from '$lib/mt5';
  import type { MonthMetrics, TradeDto, AccountDto, YearlyStatsDto, MonthlyStatsDto, Withdrawal } from '$lib/types';

  let currentTab: 'dashboard' | 'calculator' | 'drilldown' = 'dashboard';
  let selectedMonth: number | null = null;
  let selectedYear: number = new Date().getFullYear();
  let createAccountModalOpen: boolean = false; // Aberto no onMount se não houver conta salva
  let planTradeModalOpen: boolean = false;
  let planTradeDate: string = '';
  let editingTrade: TradeDto | null = null;

  function isoDay(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Estado da conta
  let currentAccount: AccountDto | null = null;
  let monthsData: MonthlyStatsDto[] = [];
  let trades: TradeDto[] = [];
  let withdrawals: Withdrawal[] = [];
  let withdrawModalOpen: boolean = false;
  let withdrawDate: string = '';
  let loading: boolean = false;

  $: currentBalance = currentAccount
    ? computeCurrentBalance(currentAccount.balance_inicial, trades, withdrawals)
    : '0';

  $: viewingMonthKey =
    selectedMonth === null
      ? ''
      : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const importedKeys = new Set<string>();

  // Backend ainda não implementado: ausência de comando é esperada (fallback local),
  // só faz barulho no console quando o erro é outro.
  function logIpcError(context: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not found|__TAURI/i.test(msg)) {
      console.debug(`${context}: backend ausente, usando dados locais.`);
    } else {
      console.error(context, err);
    }
  }

  function persistTrades(): void {
    if (currentAccount) {
      saveTrades(currentAccount.id, trades);
    }
  }

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
      logIpcError('Relatório anual', err);
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
      logIpcError('Relatório mensal', err);
      // Sem backend: garante placeholder para a visão do mês abrir (com Importar/Exportar)
      if (!monthsData.some((m) => m.month === month && m.year === year)) {
        monthsData = [
          ...monthsData,
          {
            year,
            month,
            pnl_abs: '0',
            return_pct: '0',
            num_trades: 0,
            win_rate: '0',
            profit_factor: null,
            max_drawdown_pct: '0',
          },
        ];
      }
    } finally {
      loading = false;
    }
  }

  if (typeof window !== 'undefined') {
    const saved = loadAccount();
    if (saved) {
      currentAccount = saved;
      trades = loadTrades(saved.id);
      withdrawals = loadWithdrawals(saved.id);
      for (const t of trades) {
        importedKeys.add(tradeDedupeKey(t));
      }
    } else {
      createAccountModalOpen = true;
    }
  }

  let clock: string = '';
  let clockTimer: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    if (currentAccount) {
      loadYearReport();
    }
    const updateClock = (): void => {
      clock = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    };
    updateClock();
    clockTimer = setInterval(updateClock, 1000);
  });

  onDestroy(() => {
    if (clockTimer !== null) {
      clearInterval(clockTimer);
    }
  });

  function handleAccountCreated(account: AccountDto): void {
    currentAccount = account;
    saveAccount(account);
    createAccountModalOpen = false;
    loadYearReport();
  }

  function handleYearChange(year: number): void {
    selectedYear = year;
    if (currentAccount) {
      loadYearReport();
    }
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

  function handleTradesImported(newTrades: TradeDto[]): { added: number; duplicates: number; skipped: number } {
    // Só importa o mês visualizado; o restante do relatório é ignorado
    const viewingKey =
      selectedMonth === null
        ? ''
        : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const inMonth = filterTradesByMonth(newTrades, viewingKey);
    const skipped = newTrades.length - inMonth.length;
    let duplicates = 0;
    const fresh = inMonth.filter((t) => {
      const key = tradeDedupeKey(t);
      if (importedKeys.has(key)) {
        duplicates++;
        return false;
      }
      importedKeys.add(key);
      return true;
    });
    trades = [...fresh, ...trades];
    persistTrades();
    return { added: fresh.length, duplicates, skipped };
  }

  function handleNewManualTrade(): void {
    editingTrade = null;
    // Data inicial: hoje se vendo o mês atual, senão dia 1 do mês visualizado
    const now = new Date();
    if (selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()) {
      planTradeDate = isoDay(now);
    } else if (selectedMonth !== null) {
      planTradeDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    } else {
      planTradeDate = isoDay(now);
    }
    planTradeModalOpen = true;
  }

  function handleEditTrade(trade: TradeDto): void {
    editingTrade = trade;
    planTradeDate = (trade.planned_at || '').slice(0, 10) || isoDay(new Date());
    planTradeModalOpen = true;
  }

  function handleTradeUpdated(updated: TradeDto): void {
    trades = trades.map((t) => (t.id === updated.id ? updated : t));
    importedKeys.add(tradeDedupeKey(updated));
    persistTrades();
    editingTrade = null;
  }

  function handleDeleteTrade(tradeId: string): void {
    const removed = trades.find((t) => t.id === tradeId);
    if (removed) {
      importedKeys.delete(tradeDedupeKey(removed));
    }
    trades = trades.filter((t) => t.id !== tradeId);
    persistTrades();
  }

  function persistWithdrawals(): void {
    if (currentAccount) {
      saveWithdrawals(currentAccount.id, withdrawals);
    }
  }

  function handleWithdrawRequest(): void {
    // Data inicial: hoje se vendo o mês atual, senão dia 1 do mês visualizado
    const now = new Date();
    if (selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()) {
      withdrawDate = isoDay(now);
    } else if (selectedMonth !== null) {
      withdrawDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    } else {
      withdrawDate = isoDay(now);
    }
    withdrawModalOpen = true;
  }

  function handleWithdrawConfirm(amount: string, dateISO: string): void {
    if (!currentAccount) return;
    withdrawals = [
      {
        id: crypto.randomUUID(),
        account_id: currentAccount.id,
        amount,
        date: dateISO,
        created_at: new Date().toISOString(),
      },
      ...withdrawals,
    ];
    persistWithdrawals();
    withdrawModalOpen = false;
  }

  function handleDeleteWithdrawal(withdrawalId: string): void {
    withdrawals = withdrawals.filter((w) => w.id !== withdrawalId);
    persistWithdrawals();
  }

  function handleTradePlanned(trade: TradeDto): void {
    // Adicionar novo trade à lista
    importedKeys.add(tradeDedupeKey(trade));
    trades = [trade, ...trades];
    persistTrades();
    // Recarregar relatórios para refletir o novo trade
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
      <h1 class="app-title">Dashboard e Gerenciador de Operações</h1>
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
          Calculadora
        </button>
      </div>
      <div class="account-info">
        Conta: {currentAccount.id.substring(0, 8)}... | Saldo: {formatBalance(currentBalance)} {currentAccount.ccy}
        <button class="link-btn" on:click={() => (createAccountModalOpen = true)}>
          Nova conta
        </button>
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
              trades={trades}
              withdrawals={withdrawals}
              balance={currentAccount?.balance_inicial || ''}
              onMonthClick={handleMonthClick}
              onYearChange={handleYearChange}
            />
          {/if}
        </section>
      {/if}

      {#if currentTab === 'calculator'}
        <section class="tab-content" aria-label="Calculadora de posicionamento">
          <TradeSizingForm initialBalance={currentBalance} accountCcy={currentAccount?.ccy || 'USD'} />
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
                accountId={currentAccount?.id || ''}
                accountBalance={currentAccount?.balance_inicial || ''}
                onBack={handleBackFromDrilldown}
                onTradesImported={handleTradesImported}
                onNewTrade={handleNewManualTrade}
                onEditTrade={handleEditTrade}
                onDeleteTrade={handleDeleteTrade}
                withdrawals={withdrawals}
                onWithdrawRequest={handleWithdrawRequest}
                onDeleteWithdrawal={handleDeleteWithdrawal}
              />
            {:else}
              <div class="no-data">Nenhum dado para este mês.</div>
            {/if}
          {/if}
        </section>
      {/if}
    </div>
  {/if}

  <CreateAccountModal bind:isOpen={createAccountModalOpen} onAccountCreated={handleAccountCreated} />

  {#if currentAccount}
    <PlanTradeModal
      bind:isOpen={planTradeModalOpen}
      accountId={currentAccount.id}
      balance={currentAccount.balance_inicial}
      onTradePlanned={handleTradePlanned}
    />
    <WithdrawModal
      isOpen={withdrawModalOpen}
      initialDate={withdrawDate}
      currentBalance={currentBalance}
      trades={trades}
      monthKey={viewingMonthKey}
      onConfirm={handleWithdrawConfirm}
      onCancel={() => (withdrawModalOpen = false)}
    />
  {/if}

  <footer class="app-footer">
    <span class="foot-status">
      <span class="live-dot" aria-hidden="true"></span>
      SISTEMA ONLINE
      <span class="foot-clock" aria-label="Hora local">{clock}</span>
    </span>
    <span class="foot-version">Gerenciador de Risco V1.00</span>
    <a
      class="dev-link"
      href="https://t.me/devdeni"
      target="_blank"
      rel="noopener noreferrer"
      title="Falar com o desenvolvedor no Telegram"
    >
      DEV @devdeni ↗
    </a>
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
    background-color: #09090b;
  }

  .app-header {
    background-color: #0c0c10;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
    color: #fafafa;
    padding: 1.25rem 2rem;
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .app-title {
    font-size: 1.1rem;
    margin: 0;
    font-weight: 650;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .app-title::after {
    content: '_';
    color: #22d3ee;
    animation: blink 1.2s steps(1) infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  .app-subtitle {
    font-size: 0.95rem;
    margin: 0.5rem 0 0 0;
    opacity: 0.9;
  }

  .no-account-message {
    padding: 2.5rem 2rem;
    text-align: center;
    background-color: #0c0c10;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 4px;
    margin: 2rem auto;
    max-width: 600px;
  }

  .no-account-message p {
    font-size: 0.9rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #a1a1aa;
    margin-bottom: 1.5rem;
  }

  .btn-create-account {
    padding: 0.6rem 1.6rem;
    background-color: rgba(34, 197, 94, 0.12);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.45);
    border-radius: 3px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
  }

  .btn-create-account:hover {
    background-color: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.7);
    box-shadow: 0 0 14px rgba(34, 197, 94, 0.25);
  }

  .btn-create-account:focus {
    outline: 1px solid #4ade80;
    outline-offset: 2px;
  }

  .tab-navigation {
    background-color: #0c0c10;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
    display: flex;
    gap: 0;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    padding: 0 2rem;
    align-items: stretch;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .tabs-group {
    display: flex;
    gap: 0.25rem;
    flex: 1;
  }

  .tab-button {
    padding: 0.8rem 1rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #71717a;
    transition: color 0.15s, border-color 0.15s, background-color 0.15s;
    white-space: nowrap;
  }

  .tab-button:hover {
    color: #e4e4e7;
    background-color: rgba(255, 255, 255, 0.03);
  }

  .tab-button.active {
    color: #22d3ee;
    border-bottom-color: #22d3ee;
    text-shadow: 0 0 12px rgba(34, 211, 238, 0.5);
  }

  .tab-button:focus {
    outline: 1px solid #22d3ee;
    outline-offset: -1px;
  }

  .content {
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    padding: 1.5rem 2rem 2rem 2rem;
  }

  .tab-content {
    animation: fadeIn 0.25s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .app-footer {
    position: relative;
    background-color: #0c0c10;
    color: #52525b;
    padding: 0.7rem 2rem;
    margin-top: auto;
    font-size: 0.72rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .app-footer::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.7) 30%, rgba(34, 197, 94, 0.7) 70%, transparent);
  }

  .foot-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #a1a1aa;
  }

  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: #4ade80;
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.9);
    animation: pulse-dot 1.6s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.45;
      transform: scale(0.8);
    }
  }

  .foot-clock {
    color: #22d3ee;
    font-variant-numeric: tabular-nums;
  }

  .foot-version {
    color: #52525b;
  }

  .dev-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.9rem;
    color: #22d3ee;
    border: 1px solid rgba(34, 211, 238, 0.45);
    border-radius: 3px;
    text-decoration: none;
    font-weight: 700;
    background-color: rgba(34, 211, 238, 0.06);
    transition: box-shadow 0.15s, background-color 0.15s, border-color 0.15s;
  }

  .dev-link:hover {
    background-color: rgba(34, 211, 238, 0.14);
    border-color: rgba(34, 211, 238, 0.8);
    box-shadow: 0 0 18px rgba(34, 211, 238, 0.35);
    text-shadow: 0 0 10px rgba(34, 211, 238, 0.7);
  }

  .account-info {
    margin-left: auto;
    font-size: 0.78rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #a1a1aa;
    padding: 0.8rem 0 0.8rem 1.5rem;
    border-left: 1px solid rgba(255, 255, 255, 0.09);
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .link-btn {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.78rem;
    font-weight: 600;
    color: #22d3ee;
    cursor: pointer;
  }

  .link-btn:hover {
    text-shadow: 0 0 10px rgba(34, 211, 238, 0.6);
  }

  .loading {
    padding: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 4px;
    background: linear-gradient(100deg, #0c0c10 30%, #15151b 50%, #0c0c10 70%);
    background-size: 200% 100%;
    animation: skeleton 1.4s ease infinite;
    color: transparent;
    user-select: none;
  }

  @keyframes skeleton {
    from {
      background-position: 180% 0;
    }
    to {
      background-position: -80% 0;
    }
  }

  .no-data {
    text-align: center;
    padding: 2rem;
    color: #71717a;
    font-size: 0.82rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  @media (max-width: 768px) {
    .app-header {
      padding: 1rem;
    }

    .app-title {
      font-size: 0.95rem;
    }

    .tab-navigation {
      padding: 0 1rem;
    }

    .tab-button {
      padding: 0.7rem 0.8rem;
      font-size: 0.72rem;
    }

    .content {
      padding: 1rem;
    }
  }
</style>
