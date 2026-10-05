# GERENCIADOR_RISCO

Gerenciador de risco para operações em XAUUSD/BTCUSD.

Stack: Rust + Tauri v2 + SvelteKit.

## Estrutura

- `crates/domain` — regras de negócio puras (sem IO), aritmética monetária em `rust_decimal`.
- `crates/application` — casos de uso (PlanTrade, CloseTrade, MonthlyReport, YearReport).
- `crates/infra` — persistência SQLite, migrations, export CSV, audit log.
- `crates/ipc` — comandos Tauri (`#[tauri::command]`) e DTOs serde, geração de bindings TS.
- `src-tauri/` — shell do app Tauri (scaffold do Executor).
- `src/` — frontend SvelteKit (scaffold do Executor).

## Desenvolvimento

```
cargo build --workspace
cargo test --workspace
```
