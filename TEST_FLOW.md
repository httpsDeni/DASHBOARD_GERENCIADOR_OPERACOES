# Fluxo de Teste - Gerenciador de Risco

## Pré-requisitos
- Build do Piloto completa (57 testes ✓)
- `npm install` ambas as branches
- Executar `npm run dev` (Tauri + SvelteKit dev server)

## Teste do Fluxo Completo

### 1. Criar Conta
**Esperado**: Modal abre automaticamente na inicialização

```
- Preencher:
  * Saldo Inicial: 50000
  * Moeda: USD
  * Fuso: America/Sao_Paulo
  * Risco por Trade: 2%
  * Perda Máxima Diária: 5%
  * Perda Máxima Mensal: 10%
  * Drawdown Máximo: 15%
  
- Clicar "Criar Conta"
- Verificar: Account ID aparece no header do dashboard
- Erros esperados testáveis:
  * Valores inválidos (não decimal) → INVALID_INPUT
  * Campo vazio → erro de validação
```

### 2. Dashboard Inicial
**Esperado**: YearCalendar carrega com dados reais

```
- Executado automaticamente após criar conta
- invoke('year_report', { account_id, year })
- Grid 4×3 com:
  * Verde/Vermelho/Cinza conforme win_rate
  * Tooltip com: num_trades, win_rate, pnl_abs, max_drawdown_pct
  * Navegação por teclado (Arrow keys, Enter)
```

### 3. Drill-Down Mensal
**Esperado**: Clicar mês → carregar monthly_report

```
- Clicar em qualquer tile de mês
- invoke('monthly_report', { account_id, year, month })
- Exibir:
  * Métricas: pnl_abs, return_pct, num_trades, win_rate, profit_factor, max_drawdown_pct
  * Tabela vazia (sem trades simulados) ou trades reais se Piloto tiver dados
- Botão "← Voltar" retorna ao dashboard
```

### 4. Calculadora de Posicionamento
**Esperado**: invoke('calculate_position_size') funciona

```
- Clicar aba "🧮 Calculadora"
- Preencher:
  * Instrumento: XAUUSD
  * Operação: Compra
  * Entry: 2050
  * Stop: 2045
  * Saldo: 50000
  * Risco: 2%
  
- Clicar "Calcular Posição"
- Resultado exibe:
  * lots: tamanho do lote (string)
  * risk_ccy_efetivo: risco em USD (string)
  * stop_distance: distância do stop (string)

- Testar BTCUSD também (contract_size diferente)
- Testar erros:
  * Entry == Stop → "Preencha os campos corretamente"
  * Valores inválidos → AppErrorDto -> mensagem amigável
```

## Tipos Verificados
- ✅ CreateAccountRequest → AccountDto
- ✅ CalculatePositionSizeRequest → PositionSizeResponseDto
- ✅ YearReportRequest → YearlyStatsDto
- ✅ MonthlyReportRequest → MonthlyStatsDto
- ✅ AppErrorDto (code + message)

## Acessibilidade
- ✅ Dark mode automático (prefers-color-scheme)
- ✅ ARIA grid + navegação teclado (YearCalendar)
- ✅ Focus states em botões/inputs
- ✅ Mensagens de erro com role="alert"

## Próximas Features (Não Implementadas)
- plan_trade: Vai na próxima iteração
- close_trade: Vai na próxima iteração
- Importação de trades reais: Depende do Piloto ter dados

## Notas para Piloto
- TradeSizingForm passa `symbol` (snake_case) não `instrument`
- `side`: "compra" | "venda"
- Valores monetários SEMPRE como strings (Decimal)
- `invoke()` call é non-blocking (async)
