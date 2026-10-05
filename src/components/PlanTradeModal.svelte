<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { PlanTradeRequest, TradeDto, CalculatePositionSizeRequest, PositionSizeResponseDto, AppErrorDto } from '$lib/types';

  export let isOpen: boolean = false;
  export let accountId: string = '';
  export let balance: string = '10000';
  export let plannedDate: string = todayISO();
  export let editingTrade: TradeDto | null = null;
  export let onTradePlanned: (trade: TradeDto) => void = () => {};
  export let onTradeUpdated: (trade: TradeDto) => void = () => {};

  $: isEditMode = editingTrade !== null;

  // Preenche o formulário ao abrir em modo edição
  $: if (editingTrade && isOpen) {
    symbol = editingTrade.symbol;
    side = editingTrade.side;
    entry = editingTrade.entry;
    stop = editingTrade.stop;
    take = editingTrade.take ?? '';
    fees = editingTrade.fees ?? '';
    lots = editingTrade.lots;
    plannedDate = (editingTrade.planned_at || '').slice(0, 10) || plannedDate;
    positionSize = null;
    error = null;
  }

  let loading: boolean = false;
  let error: string | null = null;

  function todayISO(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function parseNum(value: string): number {
    return parseFloat(value.replace(',', '.'));
  }

  // Backend ainda não implementa plan_trade/calculate_position_size:
  // sem bridge Tauri ou com comando ausente, calcula/cria localmente (dev).
  function isMissingBackend(err: unknown): boolean {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
    return /not found|no command|__TAURI/i.test(msg);
  }

  function buildLocalTrade(): TradeDto | null {
    const entryNum = parseNum(entry);
    const stopNum = parseNum(stop);
    if (!isFinite(entryNum) || !isFinite(stopNum) || Math.abs(entryNum - stopNum) <= 0) {
      error = 'Preencha entry e stop com valores numéricos válidos';
      return null;
    }
    return {
      id: crypto.randomUUID(),
      account_id: accountId,
      symbol,
      side,
      entry,
      stop,
      take: take || null,
      lots: lots || '0',
      risk_ccy: positionSize?.risk_ccy_efetivo ?? '0',
      fees: fees || '0',
      status: 'planejado',
      exit: null,
      pnl_ccy: null,
      planned_at: new Date(`${plannedDate}T12:00:00`).toISOString(),
      opened_at: null,
      closed_at: null,
    };
  }

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
      if (isMissingBackend(err)) {
        // Fallback local: risco de 2% do saldo / (distância do stop × tamanho do contrato)
        const entryNum = parseNum(entry);
        const stopNum = parseNum(stop);
        const balanceNum = parseNum(balance);
        const dist = Math.abs(entryNum - stopNum);
        if (!isFinite(entryNum) || !isFinite(stopNum) || !isFinite(balanceNum) || dist <= 0) {
          error = 'Preencha entry e stop com valores numéricos válidos';
          return;
        }
        const contractSize = symbol === 'XAUUSD' ? 100 : 1;
        const risk = balanceNum * 0.02;
        lots = String(risk / (dist * contractSize));
        positionSize = {
          lots,
          risk_ccy_efetivo: String(risk),
          stop_distance: String(dist),
        };
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
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

    // Edição é sempre local (sem comando update_trade no backend): preserva id e datas
    if (isEditMode && editingTrade) {
      onTradeUpdated({
        ...editingTrade,
        symbol,
        side,
        entry,
        stop,
        take: take || null,
        fees: fees || '0',
        lots,
        planned_at: new Date(`${plannedDate}T12:00:00`).toISOString(),
      });
      isOpen = false;
      resetForm();
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

      try {
        const trade = await invoke<TradeDto>('plan_trade', request);
        onTradePlanned(trade);
      } catch (ipcErr: unknown) {
        if (!isMissingBackend(ipcErr)) throw ipcErr;
        // Fallback local (backend ainda não implementado)
        const localTrade = buildLocalTrade();
        if (!localTrade) {
          loading = false;
          return;
        }
        onTradePlanned(localTrade);
      }
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
        <h2 id="modal-title" class="modal-title">{isEditMode ? 'Editar Operação' : 'Planejar Trade'}</h2>
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
            <label for="planned-date">Data da operação:</label>
            <input
              id="planned-date"
              type="date"
              bind:value={plannedDate}
              required
              disabled={loading}
            />
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
            {loading ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Planejar Trade'}
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
    background-color: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: #0c0c10;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 32px rgba(34, 211, 238, 0.06);
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 1.5rem 1.75rem;
    animation: slideIn 0.25s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-24px) scale(0.99);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
    gap: 1rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  }

  .modal-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #fafafa;
  }

  .close-btn {
    background: none;
    border: 1px solid transparent;
    font-size: 1.1rem;
    cursor: pointer;
    color: #71717a;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: color 0.15s, border-color 0.15s;
  }

  .close-btn:hover:not(:disabled) {
    color: #fafafa;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .close-btn:disabled {
    opacity: 0.4;
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

  .form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
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

  .form-group input:disabled,
  .form-group select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sizing-result {
    padding: 0.9rem 1rem;
    background-color: rgba(34, 197, 94, 0.06);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 3px;
    margin: 0.75rem 0;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .sizing-result h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.72rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #86efac;
  }

  .sizing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75rem;
  }

  .sizing-item {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .sizing-item .label {
    font-size: 0.62rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .sizing-item .value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: 600;
    font-size: 0.85rem;
    color: #4ade80;
  }

  .sizing-input {
    padding: 0.5rem 0.6rem;
    background-color: #131318;
    border: 1px solid rgba(34, 197, 94, 0.4);
    border-radius: 3px;
    font-size: 0.85rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #e4e4e7;
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
    flex: 1;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: rgba(34, 197, 94, 0.2);
    box-shadow: 0 0 14px rgba(34, 197, 94, 0.25);
  }

  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-secondary {
    background-color: #131318;
    color: #e4e4e7;
    flex: 1;
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .btn-secondary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .modal-content {
      padding: 1.25rem;
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
</style>
