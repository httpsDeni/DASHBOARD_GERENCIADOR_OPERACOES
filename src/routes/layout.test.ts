import { describe, it, expect, afterEach } from 'vitest';
import Layout from './+layout.svelte';

describe('layout contextmenu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('botão direito não abre menu (preventDefault global)', () => {
    new Layout({ target: document.body });
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('bloqueia atalhos de inspeção (F12, Ctrl+Shift+I, Ctrl+U)', () => {
    new Layout({ target: document.body });

    const f12 = new KeyboardEvent('keydown', { key: 'F12', bubbles: true, cancelable: true });
    window.dispatchEvent(f12);
    expect(f12.defaultPrevented).toBe(true);

    const inspector = new KeyboardEvent('keydown', {
      key: 'I',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(inspector);
    expect(inspector.defaultPrevented).toBe(true);

    const source = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(source);
    expect(source.defaultPrevented).toBe(true);
  });

  it('não bloqueia teclas comuns', () => {
    new Layout({ target: document.body });
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
