# 10. Motor de Recomendações

Implementação: [`mashup/src/services/insights/engine.ts`](../mashup/src/services/insights/engine.ts) ·
Testes: `engine.test.ts` (16 casos).

---

## 10.1 Regra editorial

Toda frase gerada pelo motor obedece a três exigências, nesta ordem:

1. **O que fazer** — verbo de ação, não descrição de estado.
2. **Quanto falta** — número na unidade que o vendedor usa (PDVs, toneladas, SKUs).
3. **Quanto vale** — reais de premiação, ou percentual de meta.

Frases que só descrevem o passado não entram no painel:

| ❌ Não gera | ✅ Gera |
|---|---|
| "Sua positivação caiu 8% vs. mês anterior" | "Faltam 2 PDVs para 90% da meta de positivação. Cruzar esse degrau vale R$ 3.500,00." |
| "Mix Hero em 78% da meta" | "Vendendo Manteiga para 19 dos 61 PDVs disponíveis nesta categoria, o Mix Hero fecha em 100% da meta. SKU mais indicado: Manteiga Sem Sal 500g." |
| "12 clientes inativos" | "Existem 12 PDVs que compraram nos últimos 3 meses e ainda não compraram neste mês, somando 4,8 t de volume histórico mensal. Recuperar 2 deles já fecha o gap do próximo degrau." |

**Regra de honestidade:** o motor nunca anuncia atingimento acima de 100% como conquista. Quando as
conversões disponíveis ultrapassam a meta, a frase diz "fecha em 100% da meta" e informa quantas
conversões bastam — porque ninguém trabalha para passar do teto de um programa que trava em 2%.

---

## 10.2 Arquitetura

```
                  ┌──────────────────────────────┐
  PptSummary ────►│                              │
  OppPositivação ►│      gerarInsights()         ├──► Insight[]  (ordenado por peso)
  OppHero ───────►│   8 regras independentes     │
  OppRecuperação ►│   pura · sem React · sem Qlik│
                  └──────────────────────────────┘
```

- **Função pura.** Nenhuma dependência de React, Qlik ou rede. É por isso que existe cobertura de
  teste de verdade sobre as regras que definem pagamento.
- **Regras isoladas.** Cada regra é uma função `(entrada) => Insight[]`. Uma regra que lança exceção
  é capturada e devolve lista vazia: regra quebrada não derruba o painel inteiro.
- **Ordenação por peso**, com o impacto em reais somado ao peso base. Frases de maior valor sobem.
- **Limite de exibição.** Um painel com 12 frases é uma lista de leitura que ninguém termina. O
  padrão é 4 no Overview e 2 nas telas de execução.

---

## 10.3 As oito regras

| # | Regra | Dispara quando | Severidade | Peso base |
|---|---|---|---|---|
| 1 | **KPI em risco** | Projeção de algum KPI < 90% | crítico | 1500 |
| 2 | **Categoria Hero de maior alavanca** | Existe PDV a 1 categoria do Hero | crítico/atenção | 1200 |
| 3 | **Gap de positivação** | `gap > 0` e `ganho > 0` | crítico/atenção | 1000 |
| 4 | **Gap de volume** | `gap > 0` e `ganho > 0` | crítico/atenção | 1000 |
| 5 | **PDVs que sumiram** | Fila de positivação não vazia | crítico/atenção | 900 |
| 6 | **Clientes em queda** | Fila de recuperação não vazia | atenção/informativo | 850 |
| 7 | **Dinheiro na mesa** | Captura < 99% do teto | crítico/informativo | 400 |
| 8 | **Tudo no alvo** | Os três KPIs ≥ 100% | positivo | 500 |

### Regra 1 — KPI em risco

A mais importante do conjunto, e a única que olha **projeção**, não realizado.

```ts
const perdidos = kpis.filter((k) => k.atingProjetado > 0 && k.atingProjetado < 0.9);
const valorEmRisco = perdidos.reduce((s, k) => s + sellIn * k.peso, 0);
```

> *"No ritmo atual, Positivação e Mix Hero fecham abaixo de 90% e não pagam nada. São R$ 13.000,00
> que saem da mesa se nada mudar em 8 dias úteis."*

Concordância verbal ajustada ao número de KPIs afetados — detalhe pequeno que separa um texto lido
de um texto ignorado.

### Regra 2 — Categoria Hero de maior alavanca

Agrupa os PDVs convertíveis por categoria faltante, escolhe a categoria que destrava mais PDVs e
calcula quantas conversões bastam para 100%:

```ts
const faltamPara100 = Math.max(0, Math.ceil(kpi.meta) - kpi.real);
const bastam = faltamPara100 > 0 && itens.length >= faltamPara100;
```

Quando bastam, a frase compromete com o número exato; quando não bastam, informa até onde chega.

### Regras 3 e 4 — Gaps de degrau

Sensíveis ao contexto de agregação. Em visão de um distribuidor, o texto cita o percentual do
próximo degrau. Em visão de carteira (`resumo.consolidado`), cada distribuidor persegue o próprio
degrau — então o texto soma o esforço e evita anunciar um percentual único que não existe para
ninguém.

A regra de volume converte o gap em **ritmo diário**:

> *"Faltam 2,4 t para 100% da meta de volume. São 300 kg por dia útil nos 8 dias restantes. Vale
> R$ 2.100,00."*

Tonelada por mês é abstrato; 300 kg por dia é uma decisão de rota.

### Regra 5 — PDVs que sumiram

Quando a fila é maior que o gap, adiciona o complemento que fecha o raciocínio:

> *"… Recuperar 2 deles já fecha o gap do próximo degrau."*

---

## 10.4 Simulação

`simularPositivacao(resumo, pdvsAdicionais)` responde "e se eu positivar mais N PDVs?" respeitando a
natureza de **escada** da função de pagamento:

```ts
const antes  = simularPositivacao(resumo, 1);  // 89% → ganho R$ 0
const depois = simularPositivacao(resumo, 2);  // 90% → ganho R$ 3.500
```

Um PDV a mais pode valer zero; o seguinte pode valer três mil e quinhentos. Qualquer UI que
apresente ganho marginal como linear mente sobre o programa. O teste
`'cruzar o degrau muda o prêmio em salto, não linearmente'` existe para impedir essa regressão.

Na Tela 4 a mesma ideia aparece como simulação viva sobre a lista filtrada: o alerta recalcula a
cada filtro e diz para onde o Mix Hero vai se aquelas conversões acontecerem.

---

## 10.5 Como adicionar uma regra

1. Escrever uma função `(e: EntradaInsights) => Insight[]` em `engine.ts`.
2. Registrar em `REGRAS`.
3. Definir `peso` conforme a tabela de §10.3 (mais impacto financeiro → maior peso).
4. Preencher `acaoHref` e `acaoLabel`: **insight sem destino é observação, e observação não muda
   resultado**.
5. Escrever o teste antes de considerar pronto — a regra fala sobre dinheiro.

```ts
function regraExemplo(e: EntradaInsights): Insight[] {
  const r = e.resumo;
  if (!r) return [];
  // ... condição de disparo
  return [{
    id: 'exemplo',
    peso: 700,
    severidade: 'atencao',
    kpi: 'volume',
    titulo: 'Título curto',
    texto: 'O que fazer, quanto falta, quanto vale.',
    impactoReais: 1234.56,
    acaoHref: '/recuperacao',
    acaoLabel: 'Abrir ranking',
  }];
}
```

---

## 10.6 Limites conhecidos

| Limite | Consequência | Tratamento |
|---|---|---|
| O rateio `ganhoDegrau / gapPDVs` assume que **todas** as conversões acontecem | O valor por PDV é otimista se apenas parte for convertida | A UI diz explicitamente que o degrau só paga quando todas acontecem |
| O score de recomendação é heurístico, não aprendido | Pode indicar SKU que o PDV recusa | Fase 2.2 fecha o laço e recalibra com conversão observada |
| A projeção é linear sobre dias úteis | Ignora sazonalidade e concentração de faturamento no fim do mês | Fase 2 pode substituir por curva de mês típico por canal |
| Insights não têm memória entre sessões | A mesma recomendação reaparece até a ação acontecer | Fase 2.2 adiciona o estado aceita/recusada/não visitada |
