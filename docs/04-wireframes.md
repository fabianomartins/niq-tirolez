# 4. Wireframes Detalhados

Princípio de layout de todas as telas: **o número nunca aparece sozinho**. Toda métrica é seguida
por quanto falta, em qual unidade, e quanto isso vale em reais. Percentual sem consequência é
decoração.

Convenção dos diagramas: `┌─┐` blocos, `[Componente]` componente React, `«medida»` item mestre Qlik.

---

## Tela 1 — OVERVIEW PPT

**Persona principal:** Distribuidor. **Secundária:** Executivo (com carteira filtrada).
**Pergunta:** *Onde estou hoje e quanto vou receber?*

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [Header]  PPT · Programa Por Performance Tirolez            Qlik Cloud / Sintético   │
├────────────┬─────────────────────────────────────────────────────────────────────────┤
│            │ [GlobalFilters] Competência ▾ Região ▾ Executivo ▾ Distribuidor ▾ Canal │
│ [Sidebar]  ├─────────────────────────────────────────────────────────────────────────┤
│            │ Overview PPT                                                            │
│ ACOMPANHAR │ Onde estou hoje e quanto vou receber? · 8 dias úteis restantes          │
│ • Overview │                                                                         │
│ • Executivo│ ┌─KpiCard────┐┌─KpiCard────┐┌─KpiCard────┐┌─PremiacaoCard────────────┐  │
│            │ │POSITIVAÇÃO ││VOLUME      ││MIX HERO    ││ PREMIAÇÃO ESTIMADA       │  │
│ AGIR       │ │   88,0%  ↓ ││   95,2%  ↑ ││  100,0%  ↑ ││ R$ 10.900,00             │  │
│ • Positiv. │ │Sem premiaç.││ Paga 70%   ││Meta batida ││ de R$ 20.000 · 55% teto  │  │
│ • Mix Hero │ │88 de 100   ││47,6t de 50t││40 de 40    ││ ███████░░░░░░  (garant./ │  │
│ • Op. Hero │ │▓▓▓▓▓▓▓|▓|░ ││▓▓▓▓▓▓▓▓|▓░ ││▓▓▓▓▓▓▓▓▓▓▓ ││  projeção)               │  │
│ • Recuper. │ │Faltam 2 PDV││Faltam 2,4t ││Prêmio garan││ Dinheiro na mesa  9.100  │  │
│            │ │p/ 90% —    ││p/ 100% —   ││tido de     ││ Ganho próx. degrau 5.600 │  │
│ Base       │ │R$ 3.500    ││R$ 2.100    ││R$ 6.000    ││ Sell-in base   1.000.000 │  │
│ sintética  │ └────────────┘└────────────┘└────────────┘└──────────────────────────┘  │
│            │                                                                         │
│ Peso:      │ ┌─InsightPanel──────────────┐┌─GaugeMeta──────┐┌─RadarKpis───────────┐  │
│ Pos 0,70%  │ │ O QUE FAZER AGORA         ││ PREMIAÇÃO      ││ EQUILÍBRIO KPIs     │  │
│ Vol 0,70%  │ │ ⛔ Premiação em risco     ││  CAPTURADA     ││       Positivação   │  │
│ Hero 0,60% │ │   Positivação fecha abaixo││    ╭────╮      ││          88%        │  │
│            │ │   de 90% e não paga nada. ││   ╱ 55% ╲      ││         ╱  ╲        │  │
│            │ │   R$ 7.000 saem da mesa   ││  │  ▲    │     ││  Hero  ╱____╲ Volume│  │
│            │ │   [Ver detalhamento →]    ││   ╲90 95 100   ││  100%         95%   │  │
│            │ │ ⚠ Faltam 2 PDVs p/ 90%    ││    ╰────╯      ││  — realizado        │  │
│            │ │   [Ver PDVs a recuperar →]││ tracejado =    ││  -- projeção        │  │
│            │ │ ⚠ 12 PDVs pararam de comp.││ projeção       ││  — meta (100%)      │  │
│            │ └───────────────────────────┘└────────────────┘└─────────────────────┘  │
│            │                                                                         │
│            │ ┌─EvolucaoMensal───────────────────────────────────────────────────────┐│
│            │ │ Evolução mensal      faixa sombreada = 90% a 100%                    ││
│            │ │ 110% ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  ││
│            │ │ 100% ─────────────────────────────────────────────────── (meta)      ││
│            │ │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ faixa 90-100 ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   ││
│            │ │  90% ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   ││
│            │ │      set  out  nov  dez  jan  fev  mar  abr  mai  jun  jul  ago      ││
│            │ │      — Positivação  — Volume  — Mix Hero                             ││
│            │ └──────────────────────────────────────────────────────────────────────┘│
│            │                                                                         │
│            │ Distribuidores no contexto                                              │
│            │ Ordenado por quanto cada um ganha ao cruzar o próximo degrau            │
│            │ ┌─DistribuidorTable (MUI DataGrid)────────────────────────────────────┐ │
│            │ │ Distribuidor │Região│Exec │Positiv│Volume│Hero │Premiação│Ganho │St ││ │
│            │ │ Distrib. 07  │ SP   │Ex 03│ 87% ▓ │ 92% ▓│ 78%▓│ R$ 8.4k │+5,6k │🔴 ││ │
│            │ │ Distrib. 02  │ Sul  │Ex 01│ 94% ▓ │ 97% ▓│ 91%▓│ R$14.2k │+4,1k │🟡 ││ │
│            │ └─────────────────────────────────────────────────────────────────────┘ │
└────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### Especificação dos elementos

| Elemento | Componente | Medidas | Regra de cor |
|---|---|---|---|
| KPI Positivação | `KpiCard` | «Meta Positivação», «Positivação Realizada», «% Atingimento Positivação», «PDVs para o próximo degrau», «Ganho ao cruzar o próximo degrau» | `corDeAtingimento(ating)` |
| KPI Volume | `KpiCard` | idem, com «Meta Volume (ton)» | idem |
| KPI Mix Hero | `KpiCard` | idem, com «Meta Mix Hero (PDVs)» | idem |
| Premiação | `PremiacaoCard` | «Premiação Estimada», «Premiação Potencial», «Dinheiro na mesa», «Premiação Projetada» | verde Tirolez fixo |
| Gauge | `GaugeMeta` | captura = Premiação / Potencial | arco com 4 faixas; agulha realizado; traço tracejado = projeção |
| Radar | `RadarKpis` | 3 atingimentos + 3 projeções | anel de 100% em destaque |
| Evolução | `EvolucaoMensal` (SVG) ou `NebulaChart type=linechart` | «% Ating» dos 3 KPIs por mês | faixa 90–100% sombreada |
| Tabela | `DistribuidorTable` | linha de `CUBE_SUMMARY` | barra por KPI + chip de risco |
| Insights | `InsightPanel` | `gerarInsights()` | severidade |

### Estados

- **Carregando:** esqueletos com a mesma altura dos cards (sem *layout shift*).
- **Vazio:** "Nenhum distribuidor no contexto selecionado" + botão Limpar filtros.
- **Erro de conexão:** alerta no topo + queda automática para base sintética.

### Responsivo

| Breakpoint | Comportamento |
|---|---|
| `lg` ≥ 1200 | 4 cards por linha; insights 5/12, gauge 3/12, radar 4/12 |
| `sm` 600–1199 | 2 cards por linha; gauge e radar lado a lado |
| `xs` < 600 | 1 card por linha; sidebar vira drawer; tabela rola horizontalmente |

---

## Tela 2 — OPORTUNIDADES DE POSITIVAÇÃO

**Pergunta:** *Quais PDVs pararam de comprar e quanto valem de volta?*

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Oportunidades de Positivação                                                         │
│ Quais PDVs pararam de comprar e quanto valem de volta?                               │
│                                                                                      │
│ ┌─Métrica──────┐┌─Métrica──────┐┌─Métrica──────┐┌─Métrica──────────────────────────┐ │
│ │PDVs A RECUPER││PRIORID. CRÍTI││VOLUME EM RISC││FALTAM PARA O DEGRAU              │ │
│ │     12       ││      4       ││    4,8 t     ││        2 PDVs                    │ │
│ │compraram nos ││3 deles eram  ││soma da média ││Recuperar os 2 melhores da lista  │ │
│ │últ. 3 meses  ││Mix Hero      ││mensal U3M    ││vale R$ 3.500                     │ │
│ └──────────────┘└──────────────┘└──────────────┘└──────────────────────────────────┘ │
│                                                                                      │
│ ┌─InsightPanel · Leitura da fila────────────────────────────────────────────────────┐│
│ │ ⚠ 12 PDVs que compraram nos últimos 3 meses e ainda não compraram neste mês,      ││
│ │   somando 4,8 t de volume histórico. Recuperar 2 deles já fecha o gap do degrau.  ││
│ └───────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
│ Fila priorizada de recuperação                                                       │
│ Score 0–100: volume histórico (40) + recência (25) + frequência (20) + era Hero (15) │
│ ┌─TabelaPositivacao (MUI DataGrid, ordenada por Score ▼)───────────────────────────┐ │
│ │ PDV                    │Canal    │Cidade  │Últ. compra│Meses│Média│Risco│Vale│Prio│ │
│ │ Mercado São Jorge 🏆   │Varejo   │Campinas│18/07/2026 │3 de3│0,52t│0,52t│1.750│🔴 │ │
│ │ 12.345.678/0001-90     │Tradicion│        │há 27 dias │     │     │     │ Crít│82 │ │
│ │ ────────────────────────────────────────────────────────────────────────────────│ │
│ │ Padaria Boa Vista      │Padaria  │Sorocaba│02/07/2026 │2 de3│0,31t│0,31t│1.750│🟡 │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

🏆 = troféu ao lado do nome quando `eraHero = true` (perder um PDV Hero custa dois KPIs, não um).

**Interações:** ordenação por qualquer coluna; paginação 25/50/100; clique na linha abre o PDV
na Tela 3 já filtrado (Fase 2: exportar como roteiro de visita).

---

## Tela 3 — MIX HERO NAVIGATOR (batalha naval)

**Pergunta:** *Qual PDV está incompleto, em qual categoria, e qual SKU fecha o mix?*

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Mix Hero Navigator                                                                   │
│                                                                                      │
│ ┌─Placar───────┐┌─Placar───────┐┌─Placar───────┐┌─Placar──────────────────────────┐  │
│ │ PDVS HERO    ││FALTA 1 CATEG.││  FALTA 2+    ││ PARA O PRÓXIMO DEGRAU           │  │
│ │    118       ││    175       ││     307      ││        19 PDVs                  │  │
│ │meta 122·96,7%││fila mais bara││exige +1 venda││vale R$ 9.143 · há 175 candidatos│  │
│ └──────────────┘└──────────────┘└──────────────┘└─────────────────────────────────┘  │
│                                                                                      │
│ ┌─HeroMatrix───────────────────────────────────────────────────────────────────────┐ │
│ │ [Todos·600] [Falta 1·175]◄ativo [Falta 2+·307] [Completo·118]   🔍 Buscar PDV    │ │
│ │──────────────────────────────────────────────────────────────────────────────────│ │
│ │ PDV                        │ C1 │ C2 │ C3 │ Volume │ Próxima ação                │ │
│ │──────────────────────────────────────────────────────────────────────────────────│ │
│ │ Adega Progresso            │ ✓  │ ✓  │ ✕  │ 1,3 t  │ Vender Manteiga Sem Sal    │ │
│ │ Varejo Tradicional         │verd│verd│amar│        │ 500g → vira Hero            │ │
│ │──────────────────────────────────────────────────────────────────────────────────│ │
│ │ Casa de Frios Bom Preço    │ ✕  │ ✓  │ ✓  │ 1,3 t  │ Vender Creme de Ricota      │ │
│ │ Varejo Tradicional         │amar│verd│verd│        │ Light 200g → vira Hero      │ │
│ │──────────────────────────────────────────────────────────────────────────────────│ │
│ │ Mercearia Central          │ ✕  │ ✕  │ ✓  │ 0,4 t  │ Falta: Cat 1 - Ricota;      │ │
│ │ Padaria e Conveniência     │verm│verm│verd│        │ Cat 2 - Requeijão           │ │
│ │──────────────────────────────────────────────────────────────────────────────────│ │
│ │                    [ Carregar mais (115 restantes) ]                             │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ Composição Hero: SP usa Fatiados na Cat 3; demais regiões usam Manteiga.             │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Semântica das células

| Símbolo | Situação | Cor da célula |
|---|---|---|
| `✓` | Comprou ≥1 SKU da categoria | verde `#1B7A3E` sobre `#E7F4EC` |
| `✕` | Não comprou — e falta **só uma** categoria no PDV | amarelo `#E8A317` sobre `#FDF3E0` |
| `✕` | Não comprou — e faltam **2 ou mais** | vermelho `#C0392B` sobre `#FBEAE8` |

O mesmo símbolo com cores diferentes conforme o *esforço restante* é deliberado: a cor comunica
"quão perto está a conversão", que é o que decide o roteiro de visita.

### Drill até SKU

Clique na linha → `Drawer` lateral:

```
┌─Drawer──────────────────────────────┐
│ Adega Progresso                   ✕ │
│ 12.345.678/0001-90 · Varejo Trad.   │
│ ┌─Situação do mix neste mês───────┐ │
│ │ Cat 1 - Ricota        comprou   │ │
│ │ Cat 2 - Requeijão     comprou   │ │
│ │ Cat 3 - Manteiga      falta     │ │
│ └─────────────────────────────────┘ │
│ O que vender                        │
│ ┌─RecomendacaoCard────────────────┐ │
│ │ Adega Progresso        [Crítico]│ │
│ │ ✓ Ricota  ✓ Requeijão  ✕ Manteiga│ │
│ │ ┌RECOMENDAÇÃO──────────────────┐│ │
│ │ │ Manteiga Sem Sal 500g        ││ │
│ │ │ TZ-MTS-500 · Já comprou antes││ │
│ │ └──────────────────────────────┘│ │
│ │ [⚡Vira Hero] [~50 kg] [+R$ 481]│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Decisão técnica:** componente React proprietário, não objeto Qlik. Nenhuma tabela pivô nativa
entrega ✅🟡🔴 por esforço restante, com recomendação de SKU embutida na linha, sem virar uma
expressão condicional ilegível de manter.

---

## Tela 4 — OPORTUNIDADES HERO

**Pergunta:** *Qual SKU vender, para qual PDV, e quanto isso vale?*

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Oportunidades Hero                                                                   │
│                                                                                      │
│ ┌─Alert (simulação)────────────────────────────────────────────────────────────────┐ │
│ │ Convertendo os 19 PDVs desta lista, o Mix Hero vai de 96,7% para 112,3% — mais   │ │
│ │ que suficiente para o próximo degrau, que exige 19 conversões e vale R$ 9.143.   │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│ [Só quem vira Hero com 1 venda]◄ [Todas as categorias] [Ricota] [Requeijão] [Manteiga]│
│                                                                                      │
│ ┌─RecomendacaoCard──┐┌─RecomendacaoCard──┐┌─RecomendacaoCard──┐                      │
│ │Adega Progresso    ││Casa de Frios BP   ││Mercado Central    │                      │
│ │12.345.../..-90    ││23.456.../..-11    ││34.567.../..-22    │                      │
│ │           [Crítico]││          [Crítico]││            [Alto] │                      │
│ │───────────────────││───────────────────││───────────────────│                      │
│ │ ✓ Ricota          ││ ✕ Ricota          ││ ✓ Ricota          │                      │
│ │ ✓ Requeijão       ││ ✓ Requeijão       ││ ✓ Requeijão       │                      │
│ │ ✕ Manteiga        ││ ✓ Manteiga        ││ ✕ Fatiados        │                      │
│ │┌RECOMENDAÇÃO─────┐││┌RECOMENDAÇÃO─────┐││┌RECOMENDAÇÃO─────┐│                      │
│ ││Manteiga Sem Sal ││││Creme de Ricota  ││││Prato Fatiado    ││                      │
│ ││500g             ││││Light 200g       ││││150g             ││                      │
│ ││TZ-MTS-500 ·     ││││TZ-CRL-200 ·     ││││TZ-PRF-150 ·     ││                      │
│ ││Já comprou antes ││││Mais vendido no  ││││Mais vendido no  ││                      │
│ ││                 ││││canal Varejo Trad││││canal Padaria    ││                      │
│ │└─────────────────┘││└─────────────────┘││└─────────────────┘│                      │
│ │[⚡Vira Hero]      ││[⚡Vira Hero]      ││[⚡Vira Hero]      │                      │
│ │[~50 kg][+R$ 481]  ││[~35 kg][+R$ 481]  ││[~40 kg][+R$ 481]  │                      │
│ └───────────────────┘└───────────────────┘└───────────────────┘                      │
│                       [ Carregar mais (163 restantes) ]                              │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

O alerta do topo é uma **simulação viva**: recalcula a cada mudança de filtro e responde
literalmente "quanto isso aproxima da meta e quanto aumenta a premiação".

---

## Tela 5 — POTENCIAL DE RECUPERAÇÃO

**Pergunta:** *Quem comprou menos que a própria média — e quanto isso custa na meta de volume?*

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Potencial de Recuperação                                                             │
│                                                                                      │
│ ┌─Cobertura do gap────────────────────────────────┐┌─Clientes em queda─────────────┐ │
│ │ Quanto a queda destes clientes cobre do gap     ││        47                     │ │
│ │                                                 ││ 11 em prioridade crítica ·    │ │
│ │   143%  do gap para o próximo degrau            ││ corte de 20% abaixo da média  │ │
│ │   ██████████████████████████████████████        │└───────────────────────────────┘ │
│ │                                                 │┌─Premiação recuperável─────────┐ │
│ │ Faltam 2,4 t para o próximo degrau de volume.   ││    R$ 2.100,00                │ │
│ │ Estes 47 PDVs deixaram de comprar 3,4 t em      ││ parcela do degrau de volume   │ │
│ │ relação à própria média. Trazê-los de volta ao  ││ coberta por estes clientes    │ │
│ │ patamar histórico resolve o gap inteiro.        │└───────────────────────────────┘ │
│ └─────────────────────────────────────────────────┘                                  │
│                                                                                      │
│ Ranking de recuperação                                                               │
│ Score = 60% do tamanho absoluto da queda + 40% da severidade relativa                │
│ ┌─TabelaRecuperacao───────────────────────────────────────────────────────────────┐  │
│ │ PDV                 │Canal   │Média 3m│Mês atual│Queda      │Cobre │Vale │Prior │  │
│ │ Supermercado Estrela│Atacado │ 1,84 t │ 0,62 t  │− 1,22 t   │ 51%  │1.071│🔴 91 │  │
│ │ 45.678.../..-33     │        │        │         │66,3% abaixo│      │     │Crít  │  │
│ └─────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tela 6 — VISÃO EXECUTIVO

**Pergunta:** *Qual distribuidor da minha carteira está em risco e onde minha visita rende mais?*

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Visão Executivo                                                                      │
│                                                                                      │
│ ┌─Card─────────┐┌─Card─────────┐┌─Card─────────┐┌─Card─────────────────────────────┐ │
│ │DISTRIBUIDORES││ PREMIAÇÃO    ││DISTRIB. EM   ││ HERO ABAIXO DA META              │ │
│ │   ATIVOS     ││  PROJETADA   ││   RISCO      ││        5                         │ │
│ │     12       ││ R$ 116.859   ││     3        ││ ganho disponível na carteira:    │ │
│ │3 projetam    ││de R$ 148.199 ││projeção com  ││ R$ 32.815                        │ │
│ │fechar no alvo││ · 79% do teto││KPI < 90%     ││                                  │ │
│ └──────────────┘└──────────────┘└──────────────┘└──────────────────────────────────┘ │
│                                                                                      │
│ ┌─MapaRegional──────────────┐┌─InsightPanel · Prioridades da carteira──────────────┐ │
│ │ Mapa da carteira          ││ ⛔ Premiação em risco · R$ 21.000                   │ │
│ │      ·                    ││ ⚠ A categoria que mais destrava Mix Hero · R$ 9.143 │ │
│ │   ○   ●    ·              ││ ⚠ Faltam 19 PDVs somados para o próximo degrau      │ │
│ │      ●  ○                 │└─────────────────────────────────────────────────────┘ │
│ │  ●        ○     ●         │┌─Onde a próxima visita rende mais────────────────────┐ │
│ │       ○                   ││ 1  Distribuidora 07      SP                +R$ 5.640│ │
│ │    ●     ●                ││    Pos 87% · Vol 92% · Hero 78%                     │ │
│ │                           ││ 2  Distribuidora 02      Sul               +R$ 4.130│ │
│ │ ● No alvo ● Atenção       ││ 3  Distribuidora 11      Nordeste          +R$ 3.980│ │
│ │ ● Risco alto              ││ 4  Distribuidora 04      Centro-Oeste      +R$ 2.750│ │
│ │ tamanho = premiação pot.  ││ 5  Distribuidora 09      Sudeste           +R$ 1.900│ │
│ └───────────────────────────┘└─────────────────────────────────────────────────────┘ │
│                                                                                      │
│ Carteira completa                                                                    │
│ ┌─DistribuidorTable (altura 560)──────────────────────────────────────────────────┐  │
│ └─────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

O ranking **não** ordena por pior atingimento — ordena por *ganho ao cruzar o próximo degrau*.
O distribuidor mais atrasado às vezes está tão longe do degrau que a visita não converte em nada;
o que está a dois PDVs de 95% converte na mesma tarde.

---

## Guia visual comum

| Token | Valor | Uso |
|---|---|---|
| `primary.main` | `#1B7A3E` | Verde Tirolez — header, botões, séries principais |
| `status.meta` | `#1B7A3E` | ≥ 100% |
| `status.premiada` | `#0F6FB5` | 95–99,9% |
| `status.risco` | `#E8A317` | 90–94,9% |
| `status.abaixo` | `#C0392B` | < 90% |
| `status.neutro` | `#949CA4` | sem dado |
| Raio de borda | 10 px | cards e chips |
| Grid | 8 px | espaçamento base MUI |
| Fonte | Segoe UI / system-ui | `var(--font-ui)` |

**Por que o azul existe:** a faixa 95–99,9% **paga 70%**. Pintá-la de amarelo faria o distribuidor
acreditar que está perdendo dinheiro quando está recebendo a maior parte dele. A escala de cor
espelha a escada de pagamento, não uma noção genérica de "bom/ruim".

## Acessibilidade

- Contraste mínimo 4,5:1 para texto sobre os fundos de status (verificado nos pares `STATUS_COLORS`
  × `STATUS_BG`).
- Cor **nunca** é o único canal: toda célula da matriz Hero tem símbolo (`✓` / `✕`) e `aria-label`;
  todo chip tem texto.
- SVGs com `role="img"` e `aria-label` descritivo.
- `prefers-reduced-motion` desliga transições (`globals.css`).
- Navegação por teclado preservada (MUI DataGrid e Drawer nativos).
