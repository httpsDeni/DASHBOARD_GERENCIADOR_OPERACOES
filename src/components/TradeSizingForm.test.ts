import { describe, it, expect, afterEach } from 'vitest';
import { tick } from 'svelte';
import TradeSizingForm from './TradeSizingForm.svelte';

describe('TradeSizingForm', () => {
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

  it('usa o saldo do dia e calcula lotes localmente', async () => {
    new TradeSizingForm({
      target: document.body,
      props: { initialBalance: '50000', accountCcy: 'BRL' },
    });
    await flush();

    // Saldo do dia pré-preenchido
    expect((document.getElementById('balance') as HTMLInputElement).value).toBe('50000');

    fill('entry', '2050');
    fill('stop', '2045');
    (document.querySelector('form') as HTMLFormElement).requestSubmit();
    await flush();

    // risco 1000 / (5 × 100) = 2 lotes
    const values = Array.from(document.querySelectorAll('.result-item .result-value')).map(
      (el) => (el.textContent || '').trim()
    );
    expect(values[0]).toBe('2');
    expect(values).toContain('1000');
  });

  it('risco em valor fixo com take gera R:R', async () => {
    new TradeSizingForm({
      target: document.body,
      props: { initialBalance: '50000', accountCcy: 'BRL' },
    });
    await flush();

    const mode = document.getElementById('risk-mode') as HTMLSelectElement;
    mode.value = 'fixed';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    fill('risk-fixed', '500');
    fill('entry', '2050');
    fill('stop', '2045');
    fill('take', '2060');
    (document.querySelector('form') as HTMLFormElement).requestSubmit();
    await flush();

    const values = Array.from(document.querySelectorAll('.result-item .result-value')).map(
      (el) => (el.textContent || '').trim()
    );
    // 500 / (5 × 100) = 1 lote; recompensa 10 × 100 × 1 = 1000; RR 1:2
    expect(values[0]).toBe('1');
    expect(values).toContain('1000');
    expect(document.body.textContent).toContain('1:2');
  });

  it('oferece XAUUSD e BTCUSD no topo dos instrumentos', async () => {
    new TradeSizingForm({ target: document.body, props: {} });
    await flush();

    const options = Array.from(document.querySelectorAll('#symbol option')).map(
      (o) => (o as HTMLOptionElement).value
    );
    expect(options[0]).toBe('XAUUSD');
    expect(options[1]).toBe('BTCUSD');
    expect(options).toContain('EURUSD');
  });
});
