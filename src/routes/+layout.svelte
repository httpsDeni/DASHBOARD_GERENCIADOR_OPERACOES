<script lang="ts">
  import '../app.css';
  import { onDestroy } from 'svelte';

  // App desktop: botão direito não abre menu algum
  function blockContextMenu(event: Event): void {
    event.preventDefault();
  }

  // Atalhos de inspeção (F12, Ctrl+Shift+I/J/C, Ctrl+U e equivalentes no macOS)
  function blockDevtoolsShortcut(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    if (
      event.key === 'F12' ||
      (mod && event.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
      (mod && !event.shiftKey && !event.altKey && key === 'u')
    ) {
      event.preventDefault();
    }
  }

  // Top-level (não onMount) para valer já na primeira renderização
  if (typeof window !== 'undefined') {
    window.addEventListener('contextmenu', blockContextMenu);
    window.addEventListener('keydown', blockDevtoolsShortcut);
  }

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('contextmenu', blockContextMenu);
      window.removeEventListener('keydown', blockDevtoolsShortcut);
    }
  });
</script>

<slot />
