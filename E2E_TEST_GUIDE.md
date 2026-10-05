# Guia Completo de Teste E2E - Gerenciador de Risco

## Fluxo Ponta-a-Ponta Implementado

```
[Criar Conta] → [Dashboard] → [Calcular Sizing] → [Planejar Trade] → 
[Listar Trades Abertos] → [Fechar Trade] → [Dashboard Refletindo P&L]
```

### Pré-Requisitos
- Build Piloto: `piloto/core-rust` com 57 testes passando
- Build Frontend: `npm install` na branch `scaffold/tauri-sveltekit-frontend`
- Executar: `npm run dev` (inicia Tauri + SvelteKit dev server)

---

## 📋 Passos de Teste

### 1. Criar Conta
**Ação**: Modal abre automaticamente na inicialização

```
Preencher:
├─ Saldo Inicial: 50000
├─ Moeda: USD
├─ Fuso Horário: America/Sao_Paulo
├─ Risco por Trade (%): 2
├─ Perda Máxima Diária (%): 5
├─ Perda Máxima Mensal (%): 10
└─ Drawdown Máximo (%): 15

Clicar: "Criar Conta"
```

**Resultado Esperado**:
- ✅ Modal fecha
- ✅ Account ID aparece no header (formato: Conta: 01ARZ3NZ...)
- ✅ Saldo exibido: "50000 USD"
- ✅ Dashboard carrega (heatmap vazio, pois sem trades)
- ✅ Nenhum erro de validação

---

### 2. Ir para Calculadora
**Ação**: Clicar aba "🧮 Calculadora"

```
Preencher:
├─ Instrumento: XAUUSD (dropdown)
├─ Operação: Compra
├─ Entry: 2050.00
├─ Stop: 2045.00
├─ Saldo: 50000
└─ Risco (%): 2

Clicar: "Calcular Posição"
```

**Resultado Esperado**:
- ✅ Resultado exibe:
  - Tamanho do Lote: (ex: "0.2000")
  - Risco Efetivo: (ex: "100.00")
  - Distância do Stop: (ex: "5.00")
- ✅ Nenhum erro
- ✅ Valores são strings (não números)

**Testando BTCUSD** (diferente contract_size):
```
- Mudar Instrumento: BTCUSD
- Entry: 42500.00
- Stop: 42000.00
- Resultado: lots deve ser diferente do XAUUSD (proporcionalmente)
```

---

### 3. Planejar Trade
**Ação**: Clicar "➕ Planejar Trade"

```
Modal abre. Preencher:
├─ Instrumento: XAUUSD
├─ Operação: Compra
├─ Entry: 2050.00
├─ Stop: 2045.00
├─ Take Profit: 2060.00 (opcional)
├─ Taxas: (deixar vazio)
```

**Sub-ação: Calcular Tamanho**:
```
Clicar: "Calcular Tamanho"
Resultado esperado:
├─ Pré-visualização aparece
├─ Lotes: (preenchido automaticamente)
├─ Risco: (exibido)
└─ Stop Distance: (exibido)
```

**Confirmar Trade**:
```
Clicar: "Planejar Trade"
```

**Resultado Esperado**:
- ✅ Modal fecha
- ✅ Trade aparece em "🔚 Fechar Trades" (status: "planned")
- ✅ Não há erro PERIOD_LOCKED (período não está trancado)

---

### 4. Listar Trades Abertos
**Ação**: Clicar "🔚 Fechar Trades"

```
Seção mostra:
├─ Título: "Trades Abertos (1)"
└─ Card com:
    ├─ Instrumento: XAUUSD
    ├─ Lado: ↑ Compra
    ├─ Entry: 2050.00
    ├─ Stop: 2045.00
    ├─ Take Profit: 2060.00
    ├─ Lotes: (valor do planejamento anterior)
    ├─ Risco: (valor em USD)
    ├─ Data de Abertura: (hoje)
    └─ Formulário para fechar:
        ├─ Campo "Preço de Saída"
        └─ Campo "Taxas Adicionais" (opcional)
```

**Resultado Esperado**:
- ✅ 1 trade aberto é exibido
- ✅ Todos os dados refletem o trade planejado
- ✅ Sem erros

---

### 5. Fechar Trade
**Ação**: Preencher e fechar trade

```
No card do trade aberto:
├─ Preço de Saída: 2055.00
├─ Taxas Adicionais: (deixar vazio)
└─ Clicar: "Fechar Trade"
```

**Resultado Esperado**:
- ✅ Botão mostra "Fechando..."
- ✅ Trade desaparece da lista (status → "closed")
- ✅ Seção mostra "Trades Abertos (0)"
- ✅ Nenhum erro

---

### 6. Dashboard Refletindo P&L
**Ação**: Voltar para Dashboard

```
Clicar aba: "📊 Dashboard"
```

**Resultado Esperado**:
- ✅ Heatmap carrega (pode levar alguns segundos)
- ✅ Mês atual (ex: Outubro) mostra:
  - Cor: GREEN (win = positive P&L) OU RED (loss = negative P&L)
  - Taxa de ganho: calculada com base no trade
  - Tooltip exibe:
    - num_trades: 1
    - win_rate: 100% (se P&L positivo) ou 0% (se negativo)
    - pnl_abs: (ex: "+50.00" ou "-50.00")
    - max_drawdown_pct: (ex: "2.45")

---

## 🧪 Testes Adicionais / Edge Cases

### Teste: Entry == Stop
```
Aba Calculadora:
├─ Entry: 2050.00
├─ Stop: 2050.00
└─ Clicar: "Calcular Posição"

Resultado: "Preencha os campos entry e stop corretamente"
```

### Teste: Valores Não-Decimais
```
Aba Calculadora:
├─ Entry: "abc"
└─ Clicar: "Calcular Posição"

Resultado: Error message do backend (AppErrorDto code: INVALID_INPUT)
```

### Teste: Múltiplos Trades (Opcional)
```
1. Planejar XAUUSD compra @ 2050
2. Planejar BTCUSD compra @ 42500
3. Fechar XAUUSD @ 2055 (profit)
4. Fechar BTCUSD @ 42000 (loss)

Dashboard deveria exibir:
├─ win_rate: 50% (1W, 1L)
├─ pnl_abs: (profit - loss) = net P&L
└─ Heatmap cor: depende do resultado líquido
```

---

## 🔍 Validações Críticas

### Fluxo Ativo (Green Path)
```
✅ Criar conta sem erros
✅ Calcular sizing retorna valores
✅ Planejar trade invoca IPC com sucesso
✅ Trade aparece na lista aberta
✅ Fechar trade invoca IPC com sucesso
✅ Dashboard atualiza P&L automaticamente
```

### Erros Tratados (Red Path)
```
✅ PERIOD_LOCKED → mensagem descritiva
✅ INVALID_INPUT → campo e razão exibidos
✅ Entry == Stop → erro no formulário
✅ Preço de saída vazio → erro ao fechar
```

### Acessibilidade Verificada
```
✅ Dark mode: alternar tema → cores aplicadas
✅ Teclado: Tab, Enter funcionam em formulários
✅ ARIA: labels, roles presente em componentes
✅ Focus: outline visível em botões/inputs
```

---

## 📊 Métricas de Sucesso

| Métrica | Target | Resultado |
|---------|--------|-----------|
| Criar conta | ✅ Sem erros | |
| Calcular sizing | ✅ Retorna lots, risk, distance | |
| Planejar trade | ✅ Invoke chamado, trade criado | |
| Listar trades | ✅ Exibe trades abertos | |
| Fechar trade | ✅ Invoke chamado, trade atualizado | |
| Dashboard P&L | ✅ Reflete novo P&L | |
| Cache invalidation | ✅ year_report recarregado | |
| Error handling | ✅ Mensagens amigáveis | |
| Acessibilidade | ✅ WCAG 2.2 AA | |

---

## 📝 Relatório de Teste

Após testar, documentar:

1. **Fluxo Completo Funcionou?** (SIM/NÃO)
2. **Erros Encontrados**: (listar cada um)
3. **Performance**: (tempo de cada operação)
4. **Acessibilidade OK?**: (testar com keyboard, screen reader)
5. **Dark Mode OK?**: (alternar tema)
6. **Observações**: (comportamento inesperado, UI/UX feedback)

---

## 🚀 Próximas Iterações (Não Implementadas)

- [ ] Visualização de equity curve (gráfico P&L ao longo do tempo)
- [ ] Alertas quando limites são atingidos (PERIOD_LOCKED, RiskTooSmall)
- [ ] Importação de trades históricos
- [ ] Export relatórios (PDF, Excel)
- [ ] Análise de padrões (melhor hora do dia, instrumento com maior taxa)

---

**Data**: 2026-10-05  
**Branch**: scaffold/tauri-sveltekit-frontend  
**Commit**: b6471f5  
**Status**: Pronto para E2E Testing
