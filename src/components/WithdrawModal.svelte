<script lang="ts">
  import type { TradeDto } from '$lib/types';

  export let isOpen: boolean = false;
  export let initialDate: string = '';
  export let currentBalance: string = '0';
  export let trades: TradeDto[] = [];
  export let monthKey: string = '';
  export let onConfirm: (amount: string, dateISO: string) => void = () => {};
  export let onCancel: () => void = () => {};

  let amount: string = '';
  let date: string = initialDate;
  let error: string | null = null;

  $: if (isOpen) {
    date = initialDate;
    error = null;
  }

  function parseNum(value: string | null | undefined): number {
    if (!value) return 0;
    const n = parseFloat(String(value).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  // Lucro do mês visualizado acumulado até a data escolhida
  $: profitUpToDate = trades
    .filter((t) => {
      const day = (t.closed_at ?? t.planned_at).slice(0, 10);
      return (t.closed_at ?? t.planned_at).slice(0, 7) === monthKey && day <= date;
    })
    .reduce((sum, t) => sum + parseNum(t.pnl_ccy), 0);

  $: profitRounded = Math.round(profitUpToDate * 100) / 100;

  function formatMoney(value: number): string {
    return Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function useMonthProfit(): void {
    if (profitRounded > 0) {
      amount = String(profitRounded);
      error = null;
    }
  }

  function confirm(): void {
    error = null;
    const value = parseNum(amount);
    if (!isFinite(value) || value <= 0) {
      error = 'Informe um valor de saque maior que zero';
      return;
    }
    if (value > parseNum(currentBalance)) {
      error = 'Saque maior que o saldo atual';
      return;
    }
    if (!date) {
      error = 'Informe a data do saque';
      return;
    }
    onConfirm(String(Math.round(value * 100) / 100), new Date(`${date}T12:00:00`).toISOString());
    amount = '';
  }

  function cancel(): void {
    amount = '';
    error = null;
    onCancel();
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={cancel} role="presentation">
    <div class="modal-content" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="saque-title">
      <div class="modal-header">
        <h2 id="saque-title" class="modal-title">Registrar Saque</h2>
        <button class="close-btn" on:click={cancel} aria-label="Fechar modal">✕</button>
      </div>

      {#if error}
        <div class="alert alert-error" role="alert">⚠️ {error}</div>
      {/if}

      <div class="balance-line">
        Saldo atual: <strong>{currentBalance}</strong>
      </div>

      <form on:submit|preventDefault={confirm} class="form">
        <div class="form-row">
          <div class="form-group">
            <label for="saque-valor">Valor do saque:</label>
            <input id="saque-valor" type="text" bind:value={amount} placeholder="Ex: 1000.00" required />
          </div>
          <div class="form-group">
            <label for="saque-data">Data:</label>
            <input id="saque-data" type="date" bind:value={date} required />
          </div>
        </div>

        <button
          type="button"
          class="profit-btn"
          on:click={useMonthProfit}
          disabled={profitRounded <= 0}
          title={profitRounded > 0 ? 'Preenche com o lucro do mês até a data' : 'Sem lucro acumulado até a data'}
        >
          Usar lucro total do mês até esta data ({formatMoney(profitRounded)})
        </button>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Confirmar saque</button>
          <button type="button" on:click={cancel} class="btn btn-secondary">Cancelar</button>
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
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 32px rgba(239, 68, 68, 0.08);
    max-width: 480px;
    width: calc(100% - 2rem);
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

  .close-btn:hover {
    color: #fafafa;
    border-color: rgba(255, 255, 255, 0.2);
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

  .balance-line {
    font-size: 0.82rem;
    color: #a1a1aa;
    margin-bottom: 1rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .balance-line strong {
    color: #4ade80;
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
    border-color: rgba(239, 68, 68, 0.6);
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
  }

  .profit-btn {
    padding: 0.5rem 0.75rem;
    background-color: rgba(34, 197, 94, 0.08);
    border: 1px dashed rgba(34, 197, 94, 0.45);
    border-radius: 3px;
    color: #4ade80;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s, box-shadow 0.15s;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .profit-btn:hover:not(:disabled) {
    background-color: rgba(34, 197, 94, 0.16);
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
  }

  .profit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
    background-color: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.45);
    color: #f87171;
    flex: 1;
  }

  .btn-primary:hover {
    background-color: rgba(239, 68, 68, 0.2);
    box-shadow: 0 0 14px rgba(239, 68, 68, 0.25);
  }

  .btn-secondary {
    background-color: #131318;
    color: #e4e4e7;
    flex: 1;
  }

  .btn-secondary:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }
</style>
