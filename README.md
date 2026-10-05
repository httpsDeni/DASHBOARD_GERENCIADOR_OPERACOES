# Gerenciador de Risco - XAUUSD/BTCUSD

Aplicação desktop para gestão de risco em operações com XAUUSD e BTCUSD, construída com **Rust + Tauri v2 + SvelteKit**.

## 🏗️ Arquitetura

### Estrutura do Workspace Rust

```
src-tauri/
├── Cargo.toml (app principal Tauri)
├── src/
│   ├── main.rs (entrypoint da aplicação)
│   ├── commands.rs (stubs de IPC)
│   └── build.rs
├── tauri.conf.json (configuração Tauri com CSP restritiva)
└── crates/
    ├── domain/ (lógica de negócio - a implementar)
    ├── application/ (casos de uso - a implementar)
    ├── infra/ (integrações externas - a implementar)
    └── ipc/ (handlers IPC - a implementar)
```

### Frontend SvelteKit

```
src/
├── routes/
│   ├── +page.svelte (página principal com tabs)
│   └── +layout.svelte
├── components/
│   ├── YearCalendar.svelte (heatmap anual 4×3)
│   ├── TradeSizingForm.svelte (calculadora de posição)
│   └── MonthlyDrilldown.svelte (detalhes mensais)
├── lib/
│   └── types.ts (tipos TypeScript strict)
├── app.html
├── app.css (estilos globais)
└── +page.svelte
```

## 🚀 Começando

### Pré-requisitos

- Node.js 18+
- Rust 1.70+ (instale via rustup)
- npm ou yarn

### Instalação

```bash
cd C:\Users\devdeni\Desktop\GERENCIADOR_RISCO
npm install
npm run build
```

### Desenvolvimento

```bash
npm run dev       # Dev server (SvelteKit + Tauri)
npm run build     # Build produção
npm run test      # Testes
```

## 📊 Componentes

### YearCalendar.svelte
- Grid 4×3 de meses com heatmap divergente
- Verde (>50% ganho) / Vermelho (<50% ganho) / Cinza (sem dados)
- Acessibilidade: ARIA grid, navegação teclado, ícones ▲▼
- Dark mode suportado

### TradeSizingForm.svelte
- Calculadora de posicionamento
- Campos: Instrumento, Entry, Stop, Take Profit
- TODO: Substituir stub por invoke() Tauri quando backend pronto

### MonthlyDrilldown.svelte
- Detalhes mensais com métricas RF-05
- Tabela de operações

## 🔒 Segurança

- CSP restritiva em tauri.conf.json
- TypeScript strict mode
- Sem shell capabilities
- Sem fs arbitrário

## 📝 Tipos TypeScript

Veja src/lib/types.ts para Trade, MonthMetrics, PositionSizeResponse

## 🧮 Stubs

Dados mockados e cálculos locais por enquanto. Substituir por chamadas IPC reais quando Piloto implementar backend.

## 📦 Scripts

- npm run dev - Dev server
- npm run build - Build produção
- npm run test - Testes
- npm run lint - ESLint
- npm run type-check - Type check

## 🎨 Design

- WCAG 2.2 AA
- Light + Dark mode
- Responsive (mobile, tablet, desktop)
- Paleta: Roxa principal, cores divergentes

---

Scaffold criado por Claude Executor • 2026-10-05
