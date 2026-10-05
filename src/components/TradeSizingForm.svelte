<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { CalculatePositionSizeRequest, PositionSizeResponseDto, AppErrorDto } from '$lib/types';

  // State
  let symbol: string = 'XAUUSD';
  let side: string = 'compra';
  let entry: string = '';
  let stop: string = '';
  let balance: string = '10000';
  let risk_pct: string = '2';

  let result: PositionSizeResponseDto | null = null;
  let error: string | null = null;
  let loading: boolean = false;

  async function calculatePositionSize(): Promise<void> {
    error = null;
    loading = true;

    if (!entry || !stop || entry === stop) {
      error = 'Preencha os campos entry e stop corretamente';
      loading = false;
      return;
    }

    try {
      const request: CalculatePositionSizeRequest = {
        symbol,
        side,
        entry,
        stop,
        balance,
        risk_pct,
      };

      const response = await invoke<PositionSizeResponseDto>('calculate_position_size', request);
      result = response;
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        error = (err as AppErrorDto).message || 'Erro ao calcular posição';
      } else {
        error = err instanceof Error ? err.message : 'Erro ao calcular posição';
      }
    } finally {
      loading = false;
    }
  }

  function reset(): void {
    symbol = 'XAUUSD';
    side = 'compra';
    entry = '';
    stop = '';
    balance = '10000';
    risk_pct = '2';
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
        <select
          id="symbol"
          bind:value={symbol}
          required
          aria-required="true"
        >
          <option value="XAUUSD">XAUUSD (Ouro)</option>
          <option value="BTCUSD">BTCUSD (Bitcoin)</option>
        </select>
      </div>

      <div class="form-group">
        <label for="side">Operação:</label>
        <select
          id="side"
          bind:value={side}
          required
          aria-required="true"
        >
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
        <label for="balance">Saldo da Conta:</label>
        <input
          id="balance"
          type="text"
          bind:value={balance}
          placeholder="10000"
          required
          aria-required="true"
        />
      </div>

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
    </div>

    <div class="form-actions">
      <button type="submit" disabled={loading} class="btn btn-primary">
        {loading ? 'Calculando...' : 'Calcular Posição'}
      </button>
      <button type="button" on:click={reset} class="btn btn-secondary">
        Limpar
      </button>
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
          <span class="result-label">Risco Efetivo:</span>
          <span class="result-value result-risk">{result.risk_ccy_efetivo}</span>
        </div>

        <div class="result-item">
          <span class="result-label">Distância do Stop:</span>
          <span class="result-value">{result.stop_distance}</span>
        </div>
      </div>

      <p class="result-note">
        ℹ️ Valores calculados pelo backend. Validar com seu broker.
      </p>
    </div>
  {/if}
</div>

<style>
  .form-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .form-title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1.5rem;
    color: #1f2937;
  }

  .form {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group label {
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #374151;
    font-size: 0.875rem;
  }

  .form-group input,
  .form-group select {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.95rem;
    font-family: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group input:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }

  .alert {
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.95rem;
  }

  .alert-error {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .btn-primary:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background-color: #e5e7eb;
    color: #1f2937;
  }

  .btn-secondary:hover {
    background-color: #d1d5db;
  }

  .btn-secondary:focus {
    outline: 2px solid #6b7280;
    outline-offset: 2px;
  }

  .result-container {
    margin-top: 2rem;
    padding: 1.5rem;
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
  }

  .result-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #166534;
    margin-bottom: 1rem;
  }

  .result-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .result-item {
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
    background-color: white;
    border-radius: 4px;
  }

  .result-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.25rem;
  }

  .result-value {
    font-size: 1.25rem;
    font-weight: bold;
    color: #166534;
  }

  .result-risk {
    color: #dc2626;
  }

  .result-reward {
    color: #16a34a;
  }

  .result-note {
    font-size: 0.8rem;
    color: #6b7280;
    font-style: italic;
    margin-top: 1rem;
  }

  @media (max-width: 640px) {
    .form-container {
      padding: 1rem;
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

  @media (prefers-color-scheme: dark) {
    .form-container {
      background-color: #1f2937;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .form-title {
      color: #f9fafb;
    }

    .form-group label {
      color: #d1d5db;
    }

    .form-group input,
    .form-group select {
      background-color: #374151;
      border-color: #4b5563;
      color: #f9fafb;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }

    .result-container {
      background-color: #164e63;
      border-color: #06b6d4;
    }

    .result-item {
      background-color: #1f2937;
    }

    .result-title {
      color: #a7f3d0;
    }

    .result-label {
      color: #9ca3af;
    }

    .result-value {
      color: #86efac;
    }

    .result-note {
      color: #9ca3af;
    }
  }
</style>
