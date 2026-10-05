<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { CreateAccountRequest, AccountDto, AppErrorDto } from '$lib/types';

  export let onAccountCreated: (account: AccountDto) => void = () => {};
  export let isOpen: boolean = false;

  let loading: boolean = false;
  let error: string | null = null;

  // Form fields
  let balance_inicial: string = '10000';
  let ccy: string = 'USD';
  let timezone: string = 'America/Sao_Paulo';
  let risco_por_trade_pct: string = '2';
  let perda_max_diaria_pct: string = '5';
  let perda_max_mensal_pct: string = '10';
  let dd_max_pct: string = '15';

  async function createAccount(): Promise<void> {
    error = null;
    loading = true;

    try {
      const request: CreateAccountRequest = {
        balance_inicial,
        ccy,
        timezone,
        risco_por_trade_pct,
        perda_max_diaria_pct,
        perda_max_mensal_pct,
        dd_max_pct,
      };

      // Verifica se backend IPC está disponível; se não, cria localmente (stub)
      let account: AccountDto;
      try {
        account = await invoke<AccountDto>('create_account', request);
      } catch (ipcErr) {
        // Backend ainda não implementado — cria localmente para dev
        account = {
          id: crypto.randomUUID(),
          balance_inicial,
          ccy,
          timezone,
          risco_por_trade_pct,
          perda_max_diaria_pct,
          perda_max_mensal_pct,
          dd_max_pct,
        };
      }

      onAccountCreated(account);
      isOpen = false;
      resetForm();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        const appError = err as AppErrorDto;
        switch (appError.code) {
          case 'PERIOD_LOCKED':
            error = 'Período está bloqueado. Entre em contato com suporte.';
            break;
          case 'RiskTooSmallForMinLot':
            error = 'Risco muito pequeno para o tamanho mínimo do lote.';
            break;
          case 'INVALID_INPUT':
            error = `Entrada inválida: ${appError.message}`;
            break;
          default:
            error = appError.message || 'Erro ao criar conta';
        }
      } else {
        error = err instanceof Error ? err.message : 'Erro ao criar conta';
      }
    } finally {
      loading = false;
    }
  }

  function resetForm(): void {
    balance_inicial = '10000';
    ccy = 'USD';
    timezone = 'America/Sao_Paulo';
    risco_por_trade_pct = '2';
    perda_max_diaria_pct = '5';
    perda_max_mensal_pct = '10';
    dd_max_pct = '15';
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
        <h2 id="modal-title" class="modal-title">Nova Conta de Risco</h2>
        <button class="close-btn" on:click={closeModal} aria-label="Fechar modal" disabled={loading}>
          ✕
        </button>
      </div>

      {#if error}
        <div class="alert alert-error" role="alert">
          ⚠️ {error}
        </div>
      {/if}

      <form on:submit|preventDefault={createAccount} class="form">
        <div class="form-row">
          <div class="form-group">
            <label for="balance">Saldo Inicial:</label>
            <input
              id="balance"
              type="text"
              bind:value={balance_inicial}
              placeholder="10000"
              required
              disabled={loading}
            />
          </div>

          <div class="form-group">
            <label for="ccy">Moeda:</label>
            <select id="ccy" bind:value={ccy} required disabled={loading}>
              <option value="USD">USD</option>
              <option value="BRL">BRL</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="timezone">Fuso Horário (IANA):</label>
            <select id="timezone" bind:value={timezone} required disabled={loading}>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Sao_Paulo">America/Sao_Paulo (BRT)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Paris">Europe/Paris (CET)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
            </select>
          </div>
        </div>

        <div class="section-title">Limites de Risco</div>

        <div class="form-row">
          <div class="form-group">
            <label for="risco_trade">Risco por Trade (%):</label>
            <input
              id="risco_trade"
              type="text"
              bind:value={risco_por_trade_pct}
              placeholder="2"
              required
              disabled={loading}
            />
          </div>

          <div class="form-group">
            <label for="perda_diaria">Perda Máxima Diária (%):</label>
            <input
              id="perda_diaria"
              type="text"
              bind:value={perda_max_diaria_pct}
              placeholder="5"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="perda_mensal">Perda Máxima Mensal (%):</label>
            <input
              id="perda_mensal"
              type="text"
              bind:value={perda_max_mensal_pct}
              placeholder="10"
              required
              disabled={loading}
            />
          </div>

          <div class="form-group">
            <label for="dd_max">Drawdown Máximo (%):</label>
            <input
              id="dd_max"
              type="text"
              bind:value={dd_max_pct}
              placeholder="15"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" disabled={loading} class="btn btn-primary">
            {loading ? 'Criando...' : 'Criar Conta'}
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

  .section-title {
    font-weight: 650;
    color: #a1a1aa;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 0.5rem;
    margin-bottom: 0.25rem;
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
