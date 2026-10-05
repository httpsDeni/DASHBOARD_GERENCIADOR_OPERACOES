<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { TradeDto, CloseTradeRequest, AppErrorDto } from '$lib/types';

  export let trades: TradeDto[] = [];
  export let accountId: string = '';
  export let onTradeClosed: (trade: TradeDto) => void = () => {};

  let closingTradeId: string | null = null;
  let exitPrice: { [key: string]: string } = {};
  let extraFees: { [key: string]: string } = {};
  let errors: { [key: string]: string } = {};

  // Status valores em português (do backend Piloto)
  const openTrades = trades.filter(t => t.status === 'aberto' || t.status === 'planejado');

  async function closeTrade(trade: TradeDto): Promise<void> {
    errors[trade.id] = '';
    closingTradeId = trade.id;

    if (!exitPrice[trade.id]) {
      errors[trade.id] = 'Preencha o preço de saída';
      closingTradeId = null;
      return;
    }

    try {
      const request: CloseTradeRequest = {
        account_id: accountId,
        trade_id: trade.id,
        exit: exitPrice[trade.id],
        extra_fees: extraFees[trade.id] || null,
      };

      const closedTrade = await invoke<TradeDto>('close_trade', request);
      onTradeClosed(closedTrade);

      // Limpar inputs
      delete exitPrice[trade.id];
      delete extraFees[trade.id];
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        const appError = err as AppErrorDto;
        switch (appError.code) {
          case 'INVALID_INPUT':
            errors[trade.id] = `Entrada inválida: ${appError.message}`;
            break;
          default:
            errors[trade.id] = appError.message || 'Erro ao fechar trade';
        }
      } else {
        errors[trade.id] = err instanceof Error ? err.message : 'Erro ao fechar trade';
      }
    } finally {
      closingTradeId = null;
    }
  }

  function formatCurrency(value: string): string {
    try {
      const num = parseFloat(value);
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return value;
    }
  }
</script>

<div class="trades-container">
  <h3 class="section-title">Trades Abertos ({openTrades.length})</h3>

  {#if openTrades.length === 0}
    <p class="no-trades">Nenhum trade aberto no momento.</p>
  {:else}
    <div class="trades-list">
      {#each openTrades as trade (trade.id)}
        <div class="trade-card">
          <div class="trade-header">
            <div class="trade-info">
              <span class="symbol">{trade.symbol}</span>
              <span class="side {trade.side}">{trade.side === 'compra' ? '↑ Compra' : '↓ Venda'}</span>
            </div>
            <div class="trade-prices">
              <div class="price-item">
                <span class="label">Entry:</span>
                <span class="value">{trade.entry}</span>
              </div>
              <div class="price-item">
                <span class="label">Stop:</span>
                <span class="value">{trade.stop}</span>
              </div>
              {#if trade.take}
                <div class="price-item">
                  <span class="label">TP:</span>
                  <span class="value">{trade.take}</span>
                </div>
              {/if}
            </div>
          </div>

          <div class="trade-details">
            <div class="detail-item">
              <span class="label">Lotes:</span>
              <span class="value">{trade.lots}</span>
            </div>
            <div class="detail-item">
              <span class="label">Risco:</span>
              <span class="value">{trade.risk_ccy}</span>
            </div>
            <div class="detail-item">
              <span class="label">Aberto:</span>
              <span class="value">{new Date(trade.planned_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {#if errors[trade.id]}
            <div class="alert alert-error" role="alert">
              ⚠️ {errors[trade.id]}
            </div>
          {/if}

          <div class="close-form">
            <div class="form-row">
              <div class="form-group">
                <label for="exit-{trade.id}">Preço de Saída:</label>
                <input
                  id="exit-{trade.id}"
                  type="text"
                  bind:value={exitPrice[trade.id]}
                  placeholder={trade.entry}
                  disabled={closingTradeId !== null}
                />
              </div>

              <div class="form-group">
                <label for="fees-{trade.id}">Taxas Adicionais (Opcional):</label>
                <input
                  id="fees-{trade.id}"
                  type="text"
                  bind:value={extraFees[trade.id]}
                  placeholder="0"
                  disabled={closingTradeId !== null}
                />
              </div>
            </div>

            <button
              type="button"
              on:click={() => closeTrade(trade)}
              class="btn btn-close"
              disabled={closingTradeId !== null}
            >
              {closingTradeId === trade.id ? 'Fechando...' : 'Fechar Trade'}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .trades-container {
    padding: 1.25rem 1.5rem;
    background-color: #09090b;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 4px;
  }

  .section-title {
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #fafafa;
    margin: 0 0 1.25rem 0;
  }

  .no-trades {
    color: #71717a;
    text-align: center;
    padding: 1.5rem;
    font-size: 0.82rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .trades-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .trade-card {
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 3px;
    padding: 1rem 1.25rem;
    background-color: #0c0c10;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .trade-card:hover {
    border-color: rgba(34, 211, 238, 0.35);
    box-shadow: 0 0 16px rgba(34, 211, 238, 0.08);
  }

  .trade-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
    gap: 1rem;
  }

  .trade-info {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .symbol {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: 700;
    font-size: 0.95rem;
    color: #fafafa;
  }

  .side {
    padding: 0.1rem 0.45rem;
    border-radius: 3px;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    border: 1px solid transparent;
  }

  .side.compra {
    color: #4ade80;
    background-color: rgba(34, 197, 94, 0.12);
    border-color: rgba(34, 197, 94, 0.4);
  }

  .side.venda {
    color: #f87171;
    background-color: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .trade-prices {
    display: flex;
    gap: 1rem;
  }

  .price-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .price-item .label {
    font-size: 0.62rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .price-item .value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: 600;
    font-size: 0.82rem;
    color: #e4e4e7;
  }

  .trade-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .detail-item .label {
    font-size: 0.62rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .detail-item .value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: 600;
    font-size: 0.82rem;
    color: #e4e4e7;
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

  .close-form {
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

  .form-group input {
    padding: 0.55rem 0.7rem;
    background-color: #131318;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    font-size: 0.85rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #e4e4e7;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .form-group input:focus {
    outline: none;
    border-color: rgba(34, 211, 238, 0.6);
    box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.15);
  }

  .form-group input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-close {
    padding: 0.55rem 1.25rem;
    background-color: rgba(239, 68, 68, 0.12);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.45);
    border-radius: 3px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }

  .btn-close:hover:not(:disabled) {
    background-color: rgba(239, 68, 68, 0.2);
    box-shadow: 0 0 14px rgba(239, 68, 68, 0.25);
  }

  .btn-close:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .trades-container {
      padding: 0.9rem;
    }

    .trade-header {
      flex-direction: column;
    }

    .trade-prices {
      flex-direction: column;
    }

    .trade-details {
      grid-template-columns: 1fr;
    }

    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
