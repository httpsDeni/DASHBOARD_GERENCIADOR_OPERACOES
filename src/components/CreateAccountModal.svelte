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

      const account = await invoke<AccountDto>('create_account', request);
      onAccountCreated(account);
      isOpen = false;
      resetForm();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        const appError = err as AppErrorDto;
        // Mapear erro codes para mensagens amigáveis
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

  .section-title {
    font-weight: 600;
    color: #374151;
    font-size: 0.95rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
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

    .form-group label,
    .section-title {
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
