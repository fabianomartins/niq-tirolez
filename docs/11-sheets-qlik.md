# Sheets nativas no Qlik Sense

App `f83d7052-1de9-4d66-be63-50ff4679e73c` — tenant `mtrix.us.qlikcloud.com`, espaço D2M.

As 6 telas do cockpit existem em dois lugares, de propósito:

| | Sheets nativas (este documento) | Mashup Next.js (`mashup/`) |
|---|---|---|
| Público | Analista Tirolez, coordenador, TI | Distribuidor, executivo de campo |
| Ganho | Exploração livre, seleção associativa, exportação | Motor de insights, narrativa, mobile |
| Governança | Itens mestre do app | Mesmos itens mestre, via Nebula.js |

Elas **não** são versões concorrentes: as sheets são a camada de exploração e o
mashup é a camada de execução. As duas leem o mesmo modelo e as mesmas medidas.

---

## Convenção de mês corrente

Todo objeto usa `{<FlagMesAtual={1}>}` para se ancorar no mês em curso.

O caminho de associação que faz isso funcionar nas tabelas de oportunidade não é
óbvio, então vale registrar: `OPP_POSITIVACAO`, `OPP_RECUPERACAO` e `OPP_HERO`
não carregam `%ChaveData`. Elas se ligam a `DIM_DATA` pelas **linhas-esqueleto**
(`FlagVenda = 0`) que a aba 09 injeta em `FACT_SELL_OUT`:

```
OPP_* → %ChaveDistPdvMes → FACT_SELL_OUT (linha-esqueleto) → %ChaveData → DIM_DATA
```

Sem as linhas-esqueleto, um PDV que parou de comprar não existiria no fato e a
oportunidade ficaria órfã — invisível a qualquer seleção de mês. É o mesmo motivo
pelo qual as metas nunca ficam sem par.

## Convenção de cor

Idêntica ao mashup e ao `README`:

| Faixa | Cor | Hex |
|---|---|---|
| `< 90%` | Vermelho | `#C0392B` |
| `90% – 94,9%` | Amarelo | `#E8A317` |
| `95% – 99,9%` | Azul | `#0F6FB5` |
| `≥ 100%` | Verde | `#1B7A3E` |

Nos KPIs, os `limits` do *conditional coloring* comparam o valor **numérico**. Por
isso a expressão é envelopada em `Num(expr, 'formato')` e não em `Text()`: `Num()`
devolve um dual — texto formatado para exibir, número para os segmentos compararem.
Com `Text()` todos os segmentos cairiam na primeira faixa.

---

## Inventário de objetos

### 1. Overview PPT — `b51cdb45-c779-4c0e-aa03-3f5f2787b0f4`
> Onde estou hoje e quanto vou receber?

| Objeto | Tipo | Conteúdo |
|---|---|---|
| `3b459cb0` | kpi | Atingimento Positivação |
| `09e926fc` | kpi | Atingimento Volume Sell Out |
| `95933c21` | kpi | Atingimento Mix Hero |
| `f10c0c15` | kpi | Premiação estimada vs teto de 2% do sell-in |
| `08cf6ff9` | linechart | Série mensal de atingimento |
| `4e41b4c4` | table | Carteira ordenada por ganho no próximo degrau |
| `2a868601` | filterpane | Mês · Distribuidor · Região · Executivo |

### 2. Oportunidades de Positivação — `b36259a5-602b-4d73-ac63-392d15d79ce8`
> Quais PDVs sumiram e quanto valem de volta?

| Objeto | Tipo | Conteúdo |
|---|---|---|
| `f504a473` | kpi | PDVs recuperáveis · Faltam p/ próximo degrau |
| `a955ec58` | kpi | Ganho no próximo degrau (R$) · Volume potencial perdido (t) |
| `8b1d7292` | table | Fila priorizada por `OppPos_Score` |
| `e32dc14a` | barchart | Volume perdido por canal |
| `f7beacc6` | filterpane | Mês · Distribuidor · Prioridade · Canal · Cidade |

### 3. Mix Hero Navigator — `45f02ff2-8f39-4385-a524-5f3249ec5a7f`
> Qual PDV está incompleto e em qual categoria?

| Objeto | Tipo | Conteúdo |
|---|---|---|
| `883abd2f` | kpi | Atingimento Mix Hero · PDVs para o próximo degrau |
| `3818d5ff` | table | **Batalha naval** — PDV × Cat 1/2/3 com `OK` / `FALTA` |
| `093efbe9` | heatmap | Canal × categoria faltante = PDVs bloqueados |
| `57013ecf` | filterpane | Mês · Distribuidor · Região · Status Hero · Canal |

A batalha naval lê `HeroCat1/2/3` de `AGG_HERO_PDV_MES` com `Max()`, porque o
agregado é por PDV-mês: dentro de um mês selecionado há uma linha por PDV, e
`Max()` devolve o valor dela sem depender da ordem.

Os rótulos das colunas dizem "Cat 3 — Fatiados / Manteiga" porque a composição é
regional: em SP a Cat 3 é Mussarela Fatiada / Mussarela Light / Prato Fatiado /
Prato Light; nas demais regiões é Manteiga Com Sal / Sem Sal. O `libraryId` de um
rótulo é estático, então o nome carrega as duas leituras em vez de mentir sobre uma.

### 4. Oportunidades Hero — `0e946e53-947d-4846-b0b4-6c40fce20b4e`
> Qual SKU vender, para quem, e quanto rende?

| Objeto | Tipo | Conteúdo |
|---|---|---|
| `cfb1aaf0` | kpi | PDVs a 1 categoria do Hero · Ganho no próximo degrau |
| `fca77981` | table | PDV · categoria faltante · SKU recomendado · motivo · R$ por conversão |
| `42f17217` | barchart | Top 10 SKUs que mais destravam Hero |
| `bdc8c60d` | filterpane | Mês · Distribuidor · Prioridade · Categoria faltante · Canal |

`OppHero_ConverteSozinho = 1` é a coluna que responde "vale a visita?": o PDV vira
Hero com **uma** venda. É por ela que o KPI filtra.

### 5. Potencial de Recuperação — `7b8c4d90-46fb-4b35-a5c5-ce6596ad21bb`
> Quem está abaixo da própria média histórica?

| Objeto | Tipo | Conteúdo |
|---|---|---|
| `d9d59251` | kpi | PDVs abaixo da média · queda recuperável x gap de volume |
| `e9b15d93` | table | Média U3M · volume do mês · queda t/% · cobertura do gap · R$ |
| `d0f339e4` | barchart | Top 15 PDVs por queda em toneladas |
| `e19ac768` | filterpane | Mês · Distribuidor · Prioridade · Canal · Cidade |

`OppRec_CoberturaDoGap` é a medida que fecha o raciocínio: não basta saber que o
PDV caiu 2 t, importa que essas 2 t cobrem 18% do gap que separa o distribuidor
do próximo degrau.

### 6. Visão Executivo — `433bf9a7-e58c-4e7e-9380-4ce1a3875a9f`
> Qual distribuidor da minha carteira está em risco?

| Objeto | Tipo | Conteúdo |
|---|---|---|
| `aeca3e37` | kpi | Distribuidores fora do alvo · prêmio não capturado |
| `beca4d85` | table | Carteira: 3 atingimentos, status, prêmio projetado, não capturado |
| `d3919071` | scatterplot | Esforço × retorno — atingimento médio vs ganho no degrau |
| `dff8a129` | barchart | Prêmio não capturado por região |
| `771cf967` | filterpane | Mês · Executivo · Região · Status de risco · Status do distribuidor |
| `6a6a9581` | kpi | **Descartar** — ver "Pendências manuais" |

O semáforo (`PPT_StatusRisco`) olha a **projeção** de fechamento, não o realizado.
Avisar no dia 30 que o distribuidor perdeu a premiação não é um alerta, é um
obituário. Domínio do campo: `Risco alto` · `Atencao` · `No alvo`.

---

## Pendências manuais

Três coisas que a API de sheets não faz e precisam de alguém no editor do Qlik.

**1. Remover o KPI `6a6a9581` da Tela 6.** Foi criado com
`PPT_StatusRisco={'Abaixo','Risco'}` — valores que não existem no campo, então o
contador exibe zero. O substituto correto é `aeca3e37`. O conector expõe
`add_chart` mas não `delete_chart` nem edição de expressão de objeto, então a
remoção é no editor: *Editar pasta → selecionar o objeto → Excluir*.

**2. Arranjar o layout.** O posicionamento é automático e colide: na Tela 6, por
exemplo, a tabela e o scatterplot nascem ambos em `col 0, row 2`. Abrir cada
pasta em modo de edição e arrastar resolve; nenhum dado é afetado.

**3. Apagar a pasta vazia `aNNBgxa` ("Minha nova pasta")**, criada junto com o app.

## Depois de publicar os itens mestre

As expressões dos objetos são **inline**, não `libraryId`. Isso foi deliberado: os
89 itens mestre ainda não existem no app, e um objeto apontando para um
`libraryId` inexistente quebra na renderização em vez de degradar.

Depois de rodar `node qlik/tools/deploy-master-items.mjs --app <APP_ID>`, vale
re-apontar os objetos para as medidas de biblioteca — aí a mudança de uma regra
de negócio se propaga para as 6 telas e para o mashup de uma vez só. No editor:
selecionar a medida do objeto → *Substituir por item mestre*.
