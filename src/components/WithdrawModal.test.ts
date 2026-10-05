import { describe, it, expect, vi, afterEach } from 'vitest';
import { tick } from 'svelte';
import WithdrawModal from './WithdrawModal.svelte';

describe('WithdrawModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  async function flush(): Promise<void> {
    await tick();
    await tick();
  }

  function fill(id: string, value: string): void {
    const input = document.getElementById(id) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('confirma saque com valor e data', async () => {
    const onConfirm = vi.fn();
    new WithdrawModal({
      target: document.body,
      props: {
        isOpen: true,
        initialDate: '2026-10-05',
        currentBalance: '60000',
        onConfirm,
        onCancel: () => {},
      },
    });
    await flush();

    fill('saque-valor', '1000');
    (document.querySelector('form') as HTMLFormElement).requestSubmit();
    await flush();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toBe('1000');
    expect(onConfirm.mock.calls[0][1].startsWith('2026-10-05')).toBe(true);
  });

  it('preenche com o lucro do mês até a data escolhida', async () => {
    const onConfirm = vi.fn();
    const base = {
      id: 't',
      account_id: 'c1',
      symbol: 'XAUUSD',
      side: 'venda',
      entry: '100',
      stop: '99',
      take: null,
      lots: '1',
      risk_ccy: '0',
      fees: '0',
      status: 'fechado',
      exit: '99',
      opened_at: '2026-10-01T12:00:00.000Z',
      planned_at: '2026-10-01T12:00:00.000Z',
    };
    new WithdrawModal({
      target: document.body,
      props: {
        isOpen: true,
        initialDate: '2026-10-10',
        currentBalance: '60000',
        monthKey: '2026-10',
        trades: [
          { ...base, id: 'a', pnl_ccy: '800', closed_at: '2026-10-05T12:00:00.000Z' },
          { ...base, id: 'b', pnl_ccy: '500', closed_at: '2026-10-20T12:00:00.000Z' },
        ],
        onConfirm,
        onCancel: () => {},
      },
    });
    await flush();

    // Só conta o lucro até dia 10 (800, não 1300)
    expect(document.body.textContent).toContain('800,00');
    (document.querySelector('.profit-btn') as HTMLButtonElement).click();
    await flush();
    expect((document.getElementById('saque-valor') as HTMLInputElement).value).toBe('800');

    (document.querySelector('form') as HTMLFormElement).requestSubmit();
    await flush();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toBe('800');
  });

  it('recusa saque acima do saldo', async () => {
    const onConfirm = vi.fn();
    new WithdrawModal({
      target: document.body,
      props: { isOpen: true, initialDate: '2026-10-05', currentBalance: '500', onConfirm, onCancel: () => {} },
    });
    await flush();

    fill('saque-valor', '1000');
    (document.querySelector('form') as HTMLFormElement).requestSubmit();
    await flush();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('maior que o saldo');
  });
});
