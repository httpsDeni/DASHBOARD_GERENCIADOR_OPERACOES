# Gerenciador de Risco V1.00 — Dashboard e Gerenciador de Operações

Aplicação desktop para gestão de risco e acompanhamento de operações (XAUUSD, BTCUSD e majors), construída com **Rust + Tauri v2 + SvelteKit**. Desenvolvido por **[@devdeni](https://t.me/devdeni)**.

## Funcionalidades

- **Dashboard Financial Terminal** — tema escuro (`#09090B`), números monospace, KPIs com glow, heatmap de P&L no calendário
- **Importação MT5** — lê o relatório HTML do histórico de negociação (seção Posições), filtra só o mês visualizado
- **Exportação CSV** das operações do mês
- **Operações manuais** — adicionar, editar e excluir por dia
- **Taxas e comissões** importadas e exibidas (coluna própria + totais)
- **Estatísticas do mês** — total de trades, win rate, P&L, Profit Factor (2 decimais), drawdown máximo
- **Saques** — badge dourada SAQUE no mês + opção de sacar o lucro total do mês
- **Calculadora de trade** — presets Exness, instrumentos, FX automático, TP e risco %/valor
- Conta, trades e saques persistidos em `localStorage` (sem banco externo)

## Downloads

- **Windows:** instaladores `setup.exe` (NSIS) e `.msi` gerados pelo CI em cada push
  (`Actions` > último run > Artifacts)
- **macOS:** `.dmg` gerado automaticamente pelo CI no runner `macos-latest`
  (sem assinatura Apple — ao abrir, use botão direito > Abrir)

## Desenvolvimento

```powershell
npm install
npm run dev:frontend   # Vite em http://localhost:5173
npx tauri dev          # app desktop
```

## Build local (Windows)

```powershell
npm run build          # gera setup.exe + .msi em target/release/bundle
```

Pré-requisitos: Node 20+, Rust stable. NSIS/WiX são baixados automaticamente pelo Tauri.

## CI (GitHub Actions)

O workflow [build.yml](.github/workflows/build.yml) compila em `windows-latest`
(NSIS + MSI) e `macos-latest` (DMG) a cada push na branch principal.

## Estrutura

```text
src/                    # frontend SvelteKit (rotas, componentes, lib)
src/lib/mt5.ts          # parser do relatório HTML do MT5
src/lib/stats.ts        # estatísticas mensais/anuais
src/lib/*-storage.ts    # persistência local (conta, trades, saques)
src-tauri/              # backend Rust (Tauri v2)
static/                 # assets estáticos (favicon)
```

## Licença

MIT.
