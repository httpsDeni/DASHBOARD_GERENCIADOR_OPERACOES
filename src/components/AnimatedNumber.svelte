<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  export let value: number = 0;
  export let format: (n: number) => string = (n) => String(n);

  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const display = tweened(value, { duration: reduceMotion ? 0 : 700, easing: cubicOut });
  $: display.set(value);
</script>

<span>{$display !== undefined ? format($display) : format(value)}</span>
