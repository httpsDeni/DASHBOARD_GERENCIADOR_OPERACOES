/** Formata valor monetário (string decimal) no padrão pt-BR: 600000 -> "600.000". */
export function formatBalance(value: string | null | undefined): string {
  if (!value) return '-';
  const n = parseFloat(String(value).replace(',', '.'));
  if (!isFinite(n)) return String(value);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
