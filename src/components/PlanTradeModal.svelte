<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { PlanTradeRequest, TradeDto, CalculatePositionSizeRequest, PositionSizeResponseDto, AppErrorDto } from '$lib/types';

  export let isOpen: boolean = false;
  export let accountId: string = '';
  export let balance: string = '10000';
  export let onTradePlanned: (trade: TradeDto) => void = () => {};

  let loading: boolean = false;
  let error: string | null = null;

  // Form fields
  let symbol: string = 'XAUUSD';
  let side: string = 'compra';
  let entry: string = '';
  let stop: string = '';
  let take: string = '';
  let fees: string = '';

  // Sizing preview
  let positionSize: PositionSizeResponseDto | null = null;
  let lots: string = '';

  async function calculateSizing(): Promise<void> {
    if (!entry || !stop) {
      error = 'Preencha entry e stop para calcular tamanho da posição';
      return;
    }

    try {
      const request: CalculatePositionSizeRequest = {
        symbol,
        side,
        entry,
        stop,
        balance,
        risk_pct: '2', // Default 2% risk
      };

      positionSize = await invoke<PositionSizeResponseDto>('calculate_position_size', request);
      lots = positionSize.lots;
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        error = (err as AppErrorDto).message || 'Erro ao calcular tamanho';
      } else {
        error = err instanceof Error ? err.message : 'Erro ao calcular tamanho';
      }
    }
  }

  async function planTrade(): Promise<void> {
    error = null;
    loading = true;

    if (!entry || !stop || !lots) {
      error = 'Preencha todos os campos obrigatórios (incluir tamanho da posição)';
      loading = false;
      return;
    }

    try {
      const request: PlanTradeRequest = {
        account_id: accountId,
        symbol,
        side,
        entry,
        stop,
        take: take || null,
        fees: fees || null,
      };

      const trade = await invoke<TradeDto>('plan_trade', request);
      onTradePlanned(trade);
      isOpen = false;
      resetForm();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        const appError = err as AppErrorDto;
        // Mapear error codes
        switch (appError.code) {
          case 'PERIOD_LOCKED':
            error = `Período está bloqueado. ${appError.message}`;
            break;
          case 'INVALID_INPUT':
            error = `Entrada inválida: ${appError.message}`;
            break;
          default:
            error = appError.message || 'Erro ao planejar trade';
        }
      } else {
        error = err instanceof Error ? err.message : 'Erro ao planejar trade';
      }
    } finally {
      loading = false;
    }
  }

  function resetForm(): void {
    symbol = 'XAUUSD';
    side = 'compra';
    entry = '';
    stop = '';
    take = '';
    fees = '';
    lots = '';
    positionSize = null;
    error = null;
  }

  function closeModal(): void {
    if (!loading) {
      isOpen = false;
      resetForm();
    }
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={closeModal} role="presentation">
    <div class="modal-content" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">Planejar Trade</h2>
        <button class="close-btn" on:click={closeModal} aria-label="Fechar modal" disabled={loading}>
          ✕
        </button>
      </div>

      {#if error}
        <div class="alert alert-error" role="alert">
          ⚠️ {error}
        </div>
      {/if}

      <form on:submit|preventDefault={planTrade} class="form">
        <div class="form-row">
          <div class="form-group">
            <label for="symbol">Instrumento:</label>
            <select id="symbol" bind:value={symbol} required disabled={loading}>
              <option value="XAUUSD">XAUUSD (Ouro)</option>
              <option value="BTCUSD">BTCUSD (Bitcoin)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="side">Operação:</label>
            <select id="side" bind:value={side} required disabled={loading}>
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="take">Take Profit (Opcional):</label>
            <input
              id="take"
              type="text"
              bind:value={take}
              placeholder="Ex: 2060.00"
              disabled={loading}
            />
          </div>

          <div class="form-group">
            <label for="fees">Taxas (Opcional):</label>
            <input
              id="fees"
              type="text"
              bind:value={fees}
              placeholder="0"
              disabled={loading}
            />
          </div>
        </div>

        <button type="button" on:click={calculateSizing} class="btn btn-secondary" disabled={loading}>
          Calcular Tamanho
        </button>

        {#if positionSize}
          <div class="sizing-result">
            <h4>Pré-visualização:</h4>
            <div class="sizing-grid">
              <div class="sizing-item">
                <span class="label">Lotes:</span>
                <input type="text" bind:value={lots} class="sizing-input" disabled={loading} />
              </div>
              <div class="sizing-item">
                <span class="label">Risco:</span>
                <span class="value">{positionSize.risk_ccy_efetivo}</span>
              </div>
              <div class="sizing-item">
                <span class="label">Stop Distance:</span>
                <span class="value">{positionSize.stop_distance}</span>
              </div>
            </div>
          </div>
        {/if}

        <div class="form-actions">
          <button type="submit" disabled={loading || !lots} class="btn btn-primary">
            {loading ? 'Planejando...' : 'Planejar Trade'}
          </button>
          <button type="button" on:click={closeModal} disabled={loading} class="btn btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 2rem;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .modal-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .close-btn:hover:not(:disabled) {
    background-color: #f3f4f6;
  }

  .close-btn:disabled {
    opacity: 0.5;
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

  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
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
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group input:disabled,
  .form-group select:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }

  .sizing-result {
    padding: 1rem;
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    margin: 1rem 0;
  }

  .sizing-result h4 {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    color: #166534;
  }

  .sizing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }

  .sizing-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sizing-item .label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sizing-item .value {
    font-weight: 600;
    color: #166534;
  }

  .sizing-input {
    padding: 0.5rem;
    border: 1px solid #bbf7d0;
    border-radius: 4px;
    background-color: white;
    font-size: 0.95rem;
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
    flex: 1;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background-color: #e5e7eb;
    color: #1f2937;
    flex: 1;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #d1d5db;
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .modal-content {
      padding: 1.5rem;
      max-height: 100vh;
      border-radius: 0;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column;
    }
  }

  @media (prefers-color-scheme: dark) {
    .modal-content {
      background-color: #1f2937;
    }

    .modal-title {
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

    .form-group input:disabled,
    .form-group select:disabled {
      background-color: #4b5563;
      color: #9ca3af;
    }

    .sizing-result {
      background-color: #164e63;
      border-color: #06b6d4;
    }

    .sizing-result h4 {
      color: #a7f3d0;
    }

    .sizing-item .label {
      color: #d1d5db;
    }

    .sizing-item .value {
      color: #86efac;
    }

    .sizing-input {
      background-color: #1f2937;
      border-color: #06b6d4;
      color: #f9fafb;
    }

    .btn-secondary {
      background-color: #374151;
      color: #f9fafb;
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: #4b5563;
    }

    .close-btn:hover:not(:disabled) {
      background-color: #374151;
    }
  }
</style>
