import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { tick } from 'svelte';
import Page from './+page.svelte';
import { saveAccount } from '$lib/account-storage';

function getOverlay(): HTMLElement | null {
  return document.querySelector('.modal-overlay');
}

async function flush(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    await tick();
    await new Promise((r) => setTimeout(r, 0));
    await tick();
  }
}

function mountWithAccount(): void {
  saveAccount({
    id: 'conta-salva',
    balance_inicial: '50000',
    ccy: 'BRL',
    timezone: 'America/Sao_Paulo',
    risco_por_trade_pct: '2',
    perda_max_diaria_pct: '5',
    perda_max_mensal_pct: '10',
    dd_max_pct: '15',
  });
  new Page({ target: document.body });
}

describe('CreateAccountModal reabertura', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('não abre o modal quando já existe conta salva', async () => {
    saveAccount({
      id: 'conta-salva',
      balance_inicial: '50000',
      ccy: 'BRL',
      timezone: 'America/Sao_Paulo',
      risco_por_trade_pct: '2',
      perda_max_diaria_pct: '5',
      perda_max_mensal_pct: '10',
      dd_max_pct: '15',
    });
    new Page({ target: document.body });
    await flush();
    expect(getOverlay()).toBeNull();
    // Sem operações: saldo dinâmico é igual ao inicial
    expect(document.body.textContent).toContain('50.000');
  });

  it('reabre ao clicar em Criar Conta depois de fechar clicando fora do modal', async () => {
    new Page({ target: document.body });
    await flush();

    // Modal abre automaticamente na inicialização
    expect(getOverlay()).not.toBeNull();

    // Clicar fora (no overlay) fecha o modal
    getOverlay()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(getOverlay()).toBeNull();

    // Clicar em "+ Criar Conta" deve reabrir o modal
    const btn = document.querySelector('.btn-create-account') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    await tick();
    expect(getOverlay()).not.toBeNull();
  });

  it('restaura operações salvas ao abrir e exibe no mês', async () => {
    const { saveTrades } = await import('$lib/trade-storage');
    const { saveWithdrawals } = await import('$lib/withdrawal-storage');
    mountWithAccount();
    saveWithdrawals('conta-salva', [
      {
        id: 'w1',
        account_id: 'conta-salva',
        amount: '500',
        date: `${new Date().getFullYear()}-01-10T12:00:00.000Z`,
        created_at: `${new Date().getFullYear()}-01-10T12:00:00.000Z`,
      },
    ]);
    saveTrades('conta-salva', [
      {
        id: 't1',
        account_id: 'conta-salva',
        symbol: 'XAUUSD',
        side: 'venda',
        entry: '4286.738',
        stop: '',
        take: null,
        lots: '1',
        risk_ccy: '0',
        fees: '5.00',
        status: 'fechado',
        exit: '4284.380',
        pnl_ccy: '1219.18',
        planned_at: `${new Date().getFullYear()}-01-05T12:00:00.000Z`,
        opened_at: `${new Date().getFullYear()}-01-05T12:00:00.000Z`,
        closed_at: `${new Date().getFullYear()}-01-05T12:00:00.000Z`,
      },
    ]);
    // Remonta para carregar o que foi salvo
    document.body.innerHTML = '';
    mountWithAccount();
    await flush();

    // Dashboard já mostra o P&L de janeiro no calendário
    const tiles = Array.from(document.querySelectorAll('.month-tile'));
    expect(tiles[0].textContent).toContain('1.219,18');
    // Badge dourada de saque no topo do mês
    const badge = tiles[0].querySelector('.withdraw-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('SAQUE');
    expect(badge?.textContent).toContain('500,00');

    const tile = document.querySelector('.month-tile') as HTMLButtonElement;
    tile.click();
    await flush(5);
    expect(document.body.textContent).toContain('XAUUSD');
    expect(document.body.textContent).toContain('1.219,18');
    expect(document.body.textContent).toContain('Taxas Pagas');
    expect(document.body.textContent).toContain('5,00');

    const devLink = document.querySelector('.dev-link') as HTMLAnchorElement;
    expect(devLink).not.toBeNull();
    expect(devLink.href).toBe('https://t.me/devdeni');
    expect(devLink.target).toBe('_blank');
  });

  it('navega o calendário para anos passados e futuros', async () => {
    mountWithAccount();
    await flush();

    const currentYear = new Date().getFullYear();
    const title = document.querySelector('.calendar-title') as HTMLElement;
    expect(title.textContent).toContain(String(currentYear));

    const clickYearNav = (label: string): void => {
      // Re-consulta a cada clique: o botão pode ser recriado no re-render
      (document.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement).click();
    };

    clickYearNav('Próximo ano');
    await flush();
    expect(document.querySelector('.calendar-title')?.textContent).toContain(String(currentYear + 1));

    clickYearNav('Ano anterior');
    await flush();
    clickYearNav('Ano anterior');
    await flush();
    expect(document.querySelector('.calendar-title')?.textContent).toContain(String(currentYear - 1));
  });

  it('saque diminui o saldo e aparece nas estatísticas do mês', async () => {
    mountWithAccount();
    await flush();

    const year = new Date().getFullYear();
    (document.querySelector('.month-tile') as HTMLButtonElement).click();
    await flush(5);

    const saqueBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('Saque')
    ) as HTMLButtonElement;
    expect(saqueBtn).not.toBeUndefined();
    saqueBtn.click();
    await flush();

    // Data padrão: dia 1 do mês visualizado (janeiro, fora do mês atual)
    expect((document.getElementById('saque-data') as HTMLInputElement).value).toBe(`${year}-01-01`);

    const valor = document.getElementById('saque-valor') as HTMLInputElement;
    valor.value = '1000';
    valor.dispatchEvent(new Event('input', { bubbles: true }));
    (document.querySelector('#saque-data') as HTMLInputElement).dispatchEvent(new Event('input', { bubbles: true }));
    (document.querySelector('.modal-content form') as HTMLFormElement).requestSubmit();
    await flush();

    expect(document.body.textContent).toContain('Saques');
    expect(document.body.textContent).toContain('1.000,00');
    // Saldo do topo: 50.000 − 1.000
    expect(document.querySelector('.account-info')?.textContent).toContain('49.000');
  });

  it('voltar do mês retorna ao dashboard', async () => {
    mountWithAccount();
    await flush();

    const tile = document.querySelector('.month-tile') as HTMLButtonElement;
    tile.click();
    await flush(5);
    expect(document.querySelector('.drilldown-container')).not.toBeNull();

    const back = document.querySelector('[aria-label="Voltar"]') as HTMLButtonElement;
    expect(back).not.toBeNull();
    back.click();
    await flush();

    expect(document.querySelector('.drilldown-container')).toBeNull();
    expect(document.querySelector('.months-grid')).not.toBeNull();
  });

  it('clicar no mês abre a visão do mês com Importar/Exportar (sem backend)', async () => {
    mountWithAccount();
    await flush();

    const tile = document.querySelector('.month-tile') as HTMLButtonElement;
    expect(tile).not.toBeNull();
    tile.click();
    await flush(5);

    const buttons = Array.from(document.querySelectorAll('button')).map((b) =>
      (b.textContent || '').trim()
    );
    expect(buttons).toContain('Importar MT5');
    expect(buttons).toContain('Exportar CSV');
  });
});
