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

  const openTrades = trades.filter(t => t.status === 'opened' || t.status === 'planned');

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
    padding: 2rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1.5rem 0;
  }

  .no-trades {
    color: #6b7280;
    text-align: center;
    padding: 2rem;
    font-style: italic;
  }

  .trades-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .trade-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    background-color: #f9fafb;
  }

  .trade-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .trade-info {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .symbol {
    font-weight: 700;
    font-size: 1.1rem;
    color: #1f2937;
  }

  .side {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .side.compra {
    background-color: #dcfce7;
    color: #166534;
  }

  .side.venda {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .trade-prices {
    display: flex;
    gap: 1rem;
  }

  .price-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .price-item .label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .price-item .value {
    font-weight: 600;
    color: #1f2937;
  }

  .trade-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-item .label {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .detail-item .value {
    font-weight: 600;
    color: #1f2937;
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

  .close-form {
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

  .form-group input {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.95rem;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group input:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }

  .btn-close {
    padding: 0.75rem 1.5rem;
    background-color: #dc2626;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  .btn-close:hover:not(:disabled) {
    background-color: #b91c1c;
  }

  .btn-close:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .trades-container {
      padding: 1rem;
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

  @media (prefers-color-scheme: dark) {
    .trades-container {
      background-color: #1f2937;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .section-title {
      color: #f9fafb;
    }

    .trade-card {
      background-color: #374151;
      border-color: #4b5563;
    }

    .symbol {
      color: #f9fafb;
    }

    .price-item .label,
    .detail-item .label,
    .form-group label {
      color: #d1d5db;
    }

    .price-item .value,
    .detail-item .value {
      color: #f9fafb;
    }

    .trade-details {
      border-bottom-color: #4b5563;
    }

    .form-group input {
      background-color: #4b5563;
      border-color: #6b7280;
      color: #f9fafb;
    }

    .form-group input:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }

    .form-group input:disabled {
      background-color: #6b7280;
      color: #d1d5db;
    }
  }
</style>
