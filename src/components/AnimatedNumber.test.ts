import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import AnimatedNumber from './AnimatedNumber.svelte';

describe('AnimatedNumber', () => {
  it('exibe o valor formatado de imediato', async () => {
    new AnimatedNumber({
      target: document.body,
      props: {
        value: 1219.18,
        format: (n: number) =>
          `${n > 0 ? '+' : ''}${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    });
    await tick();
    expect(document.body.textContent).toContain('+1.219,18');
    document.body.innerHTML = '';
  });
});
