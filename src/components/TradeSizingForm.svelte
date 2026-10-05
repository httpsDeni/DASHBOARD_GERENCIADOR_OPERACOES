<script lang="ts">
  import {
    INSTRUMENTS,
    EXNESS_ACCOUNT_TYPES,
    calculateLots,
    fetchConversionRate,
    type SizingResult,
  } from '$lib/instruments';

  // Saldo do dia (conta) e moeda, vindos da página
  export let initialBalance: string = '10000';
  export let accountCcy: string = 'USD';

  // State
  let symbol: string = 'XAUUSD';
  let side: string = 'compra';
  let entry: string = '';
  let stop: string = '';
  let take: string = '';
  let balance: string = initialBalance;
  let riskMode: 'pct' | 'fixed' = 'pct';
  let risk_pct: string = '2';
  let riskFixed: string = '';
  let accountTypeId: string = 'standard';
  let leverage: string = '500';
  let conversionRate: string = '1';
  let rateSource: string = '';
  let rateLoading: boolean = false;

  let result: SizingResult | null = null;
  let error: string | null = null;

  // Acompanha o saldo do dia enquanto o usuário não editou o campo
  let balanceTouched: boolean = false;
  $: if (!balanceTouched) {
    balance = initialBalance;
  }

  $: spec = INSTRUMENTS.find((i) => i.symbol === symbol);
  $: accountType = EXNESS_ACCOUNT_TYPES.find((t) => t.id === accountTypeId) ?? EXNESS_ACCOUNT_TYPES[0];

  // Busca o câmbio automaticamente quando o par de moedas muda
  let lastRatePair: string = '';
  $: {
    const pair = `${spec?.quoteCcy ?? ''}>${accountCcy}`;
    if (pair !== lastRatePair && spec) {
      lastRatePair = pair;
      void refreshRate();
    }
  }

  async function refreshRate(): Promise<void> {
    if (!spec) return;
    if (spec.quoteCcy === accountCcy) {
      conversionRate = '1';
      rateSource = 'paridade 1:1';
      return;
    }
    rateLoading = true;
    try {
      const rate = await fetchConversionRate(spec.quoteCcy, accountCcy);
      conversionRate = String(rate);
      rateSource = `auto ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      rateSource = 'manual (sem internet)';
    } finally {
      rateLoading = false;
    }
  }

  function calculatePositionSize(): void {
    error = null;
    try {
      result = calculateLots({
        symbol,
        balance,
        riskMode,
        riskPct: risk_pct,
        riskFixed,
        entry,
        stop,
        take,
        conversionRate,
        leverage,
        commissionPerLotUsd: accountType.commissionPerLotUsd,
      });
    } catch (err: unknown) {
      result = null;
      error = err instanceof Error ? err.message : 'Erro ao calcular posição';
    }
  }

  function reset(): void {
    symbol = 'XAUUSD';
    side = 'compra';
    entry = '';
    stop = '';
    take = '';
    balance = initialBalance;
    balanceTouched = false;
    riskMode = 'pct';
    risk_pct = '2';
    riskFixed = '';
    accountTypeId = 'standard';
    leverage = '500';
    conversionRate = '1';
    rateSource = '';
    result = null;
    error = null;
  }
</script>

<div class="form-container">
  <h2 class="form-title">Calculadora de Posicionamento</h2>

  {#if error}
    <div class="alert alert-error" role="alert">
      ⚠️ {error}
    </div>
  {/if}

  <form on:submit|preventDefault={calculatePositionSize} class="form">
    <div class="form-row">
      <div class="form-group">
        <label for="symbol">Instrumento:</label>
        <select id="symbol" bind:value={symbol} required aria-required="true">
          {#each INSTRUMENTS as inst}
            <option value={inst.symbol}>{inst.label}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="side">Operação:</label>
        <select id="side" bind:value={side} required aria-required="true">
          <option value="compra">Compra</option>
          <option value="venda">Venda</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="entry">Entry (Entrada):</label>
        <input
          id="entry"
          type="text"
          bind:value={entry}
          placeholder="Ex: 2050.00"
          required
          aria-required="true"
        />
      </div>

      <div class="form-group">
        <label for="stop">Stop Loss:</label>
        <input
          id="stop"
          type="text"
          bind:value={stop}
          placeholder="Ex: 2045.00"
          required
          aria-required="true"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="balance">Saldo da Conta ({accountCcy}, do dia):</label>
        <input
          id="balance"
          type="text"
          bind:value={balance}
          on:input={() => (balanceTouched = true)}
          placeholder="10000"
          required
          aria-required="true"
        />
      </div>

      <div class="form-group">
        <label for="risk-mode">Risco em:</label>
        <select id="risk-mode" bind:value={riskMode} aria-label="Modo de risco">
          <option value="pct">% do saldo</option>
          <option value="fixed">Valor ({accountCcy})</option>
        </select>
      </div>

      {#if riskMode === 'pct'}
        <div class="form-group">
          <label for="risk-pct">Risco (%):</label>
          <input
            id="risk-pct"
            type="text"
            bind:value={risk_pct}
            placeholder="2"
            required
            aria-required="true"
          />
        </div>
      {:else}
        <div class="form-group">
          <label for="risk-fixed">Risco ({accountCcy}):</label>
          <input
            id="risk-fixed"
            type="text"
            bind:value={riskFixed}
            placeholder="Ex: 500.00"
            required
            aria-required="true"
          />
        </div>
      {/if}
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="take">Take Profit (opcional):</label>
        <input
          id="take"
          type="text"
          bind:value={take}
          placeholder="Ex: 2060.00"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="account-type">Tipo de Conta (Exness):</label>
        <select id="account-type" bind:value={accountTypeId} required aria-required="true">
          {#each EXNESS_ACCOUNT_TYPES as t}
            <option value={t.id}>{t.label}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="leverage">Alavancagem:</label>
        <select id="leverage" bind:value={leverage} required aria-required="true">
          <option value="100">1:100</option>
          <option value="200">1:200</option>
          <option value="500">1:500</option>
          <option value="1000">1:1000</option>
          <option value="2000">1:2000</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="conversion">Conversão {spec?.quoteCcy ?? ''} → {accountCcy}:</label>
        <input
          id="conversion"
          type="text"
          bind:value={conversionRate}
          placeholder="1"
          required
          aria-required="true"
        />
      </div>
      <div class="form-group">
        <label for="rate-refresh">Cotação:</label>
        <div class="rate-row">
          <button
            id="rate-refresh"
            type="button"
            class="btn btn-secondary"
            on:click={() => void refreshRate()}
            disabled={rateLoading}
          >
            {rateLoading ? 'Buscando...' : 'Atualizar'}
          </button>
          {#if rateSource}
            <span class="rate-source">{rateSource}</span>
          {/if}
        </div>
      </div>
    </div>
    {#if spec && spec.quoteCcy !== accountCcy && !rateSource.startsWith('auto')}
      <p class="result-note">
        Sem internet a taxa fica manual: informe 1 {spec.quoteCcy} em {accountCcy}.
      </p>
    {/if}

    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Calcular Posição</button>
      <button type="button" on:click={reset} class="btn btn-secondary">Limpar</button>
    </div>
  </form>

  {#if result}
    <div class="result-container">
      <h3 class="result-title">Resultado do Cálculo</h3>

      <div class="result-grid">
        <div class="result-item">
          <span class="result-label">Tamanho do Lote:</span>
          <span class="result-value">{result.lots}</span>
        </div>

        <div class="result-item">
          <span class="result-label">Risco ({accountCcy}):</span>
          <span class="result-value result-risk">{result.riskAccount}</span>
        </div>

        <div class="result-item">
          <span class="result-label">Distância do Stop:</span>
          <span class="result-value">{result.stopDistance}</span>
        </div>

        <div class="result-item">
          <span class="result-label">Margem Estimada ({accountCcy}):</span>
          <span class="result-value">{result.marginAccount}</span>
        </div>

        <div class="result-item">
          <span class="result-label">Comissão Est. (USD, ida+volta):</span>
          <span class="result-value">{result.commissionUsd}</span>
        </div>

        <div class="result-item">
          <span class="result-label">Stop por Lote ({spec?.quoteCcy}):</span>
          <span class="result-value">{result.stopValuePerLotQuote}</span>
        </div>

        {#if result.rewardAccount !== null}
          <div class="result-item">
            <span class="result-label">Recompensa ({accountCcy}):</span>
            <span class="result-value result-reward">{result.rewardAccount}</span>
          </div>

          <div class="result-item">
            <span class="result-label">R:R:</span>
            <span class="result-value result-reward">{result.rrRatio}</span>
          </div>
        {/if}
      </div>

      <p class="result-note">
        Cálculo local por especificações padrão (contrato {spec?.contractSize}/lote). Comissão e margem são estimativas — validar com a Exness.
      </p>
    </div>
  {/if}
</div>

<style>
  .form-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.25rem 1.5rem;
    background-color: #09090b;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 4px;
  }

  .form-title {
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 1.25rem;
    color: #fafafa;
  }

  .form {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group label {
    font-weight: 600;
    margin-bottom: 0.35rem;
    color: #71717a;
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .form-group input,
  .form-group select {
    padding: 0.55rem 0.7rem;
    background-color: #131318;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    font-size: 0.85rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #e4e4e7;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: rgba(34, 211, 238, 0.6);
    box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.15);
  }

  .form-group input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .rate-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .rate-row .btn {
    flex-shrink: 0;
  }

  .rate-source {
    font-size: 0.72rem;
    color: #71717a;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }

  .btn {
    padding: 0.6rem 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }

  .btn-primary {
    background-color: rgba(34, 197, 94, 0.12);
    border-color: rgba(34, 197, 94, 0.45);
    color: #4ade80;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: rgba(34, 197, 94, 0.2);
    box-shadow: 0 0 14px rgba(34, 197, 94, 0.25);
  }

  .btn-primary:focus {
    outline: 1px solid #4ade80;
    outline-offset: 2px;
  }

  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-secondary {
    background-color: #131318;
    color: #e4e4e7;
  }

  .btn-secondary:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .btn-secondary:focus {
    outline: 1px solid #71717a;
    outline-offset: 2px;
  }

  .result-container {
    margin-top: 1.5rem;
    padding: 1rem 1.25rem;
    background-color: rgba(34, 197, 94, 0.06);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 3px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 18px rgba(34, 197, 94, 0.08);
  }

  .result-title {
    font-size: 0.72rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #86efac;
    margin-bottom: 0.75rem;
  }

  .result-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
  }

  .result-item {
    display: flex;
    flex-direction: column;
    padding: 0.6rem 0.75rem;
    background-color: #0c0c10;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 3px;
  }

  .result-label {
    font-size: 0.62rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.25rem;
  }

  .result-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 1.15rem;
    font-weight: 650;
    color: #4ade80;
    font-variant-numeric: tabular-nums;
  }

  .result-risk {
    color: #f87171;
  }

  .result-reward {
    color: #4ade80;
  }

  .result-note {
    font-size: 0.75rem;
    color: #71717a;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    margin-top: 0.75rem;
  }

  @media (max-width: 640px) {
    .form-container {
      padding: 0.9rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .result-grid {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
