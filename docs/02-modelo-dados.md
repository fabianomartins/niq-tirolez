# 2. Modelo de Dados

## 2.1 Visão geral — estrela com satélites de agregação

```
                            ┌───────────────┐
                            │   DIM_DATA    │
                            └───────┬───────┘
                                    │ %ChaveData
      ┌───────────────┐             │             ┌───────────────┐
      │  DIM_PRODUTO  │─%ChaveProd──┤             │    DIM_PDV    │
      └───────┬───────┘             │             └───────┬───────┘
              │                     │                     │ %ChavePDV
              │            ┌────────▼─────────┐           │
              │            │                  │◄──────────┘
              └─%ChaveHero►│  FACT_SELL_OUT   │
                           │                  │◄──%ChaveDistribuidor──┐
      ┌───────────────┐    └───┬──────────┬───┘                       │
      │   DIM_HERO    │────────┘          │                  ┌────────┴────────┐
      └───────────────┘                   │                  │ DIM_DISTRIBUIDOR│
                                          │                  └────────┬────────┘
        ┌─────────────────────────────────┼──────────────┐            │ %ChaveRegiao
        │ %ChaveDistMes                   │ %ChaveDistPdvMes          │ %ChaveExecutivo
┌───────▼──────────┐            ┌─────────▼──────────┐       ┌────────▼────────┐
│ FACT_PPT_MENSAL  │            │ AGG_HERO_PDV_MES   │       │   DIM_REGIAO    │
│ (meta+realizado  │            │ (flags cat 1/2/3,  │       │   DIM_EXECUTIVO │
│  +premiação R$)  │            │  status, gap)      │       └─────────────────┘
└──────────────────┘            └─────────┬──────────┘
                                          │ %ChaveDistPdvMes
             ┌────────────────────────────┼────────────────────────────┐
   ┌─────────▼────────┐         ┌─────────▼────────┐         ┌─────────▼────────┐
   │ OPP_POSITIVACAO  │         │ OPP_RECUPERACAO  │         │     OPP_HERO     │
   │  (PDV que sumiu) │         │(PDV que encolheu)│         │  (SKU a vender)  │
   └──────────────────┘         └──────────────────┘         └──────────────────┘
```

**Leitura do modelo:** `FACT_SELL_OUT` é o centro. As tabelas de agregação e de oportunidade são
**folhas** penduradas no fato por chaves compostas — nunca ligadas diretamente às dimensões.
Isso elimina referência circular sem recorrer a link table e mantém a propagação de seleção correta:

| Seleção do usuário | FACT_PPT_MENSAL é filtrado? | Comportamento desejado? |
|---|---|---|
| Mês | ✅ Sim (via `%ChaveDistMes`) | ✅ Meta do mês selecionado |
| Distribuidor | ✅ Sim | ✅ Meta do distribuidor |
| PDV específico | ❌ Não | ✅ **Correto** — meta não encolhe por PDV |
| Produto/SKU | ❌ Não | ✅ **Correto** — meta não encolhe por SKU |

---

## 2.2 Grão das tabelas

| Tabela | Grão | Volume estimado (24 meses) |
|---|---|---|
| `FACT_SELL_OUT` | Distribuidor × PDV × SKU × Dia | ~ 18 M linhas |
| `AGG_HERO_PDV_MES` | Distribuidor × PDV × Mês | ~ 1,1 M linhas |
| `FACT_PPT_MENSAL` | Distribuidor × Mês | ~ 960 linhas |
| `OPP_POSITIVACAO` | Distribuidor × PDV × Mês de referência | ~ 90 k linhas |
| `OPP_HERO` | Distribuidor × PDV × Mês × Categoria faltante | ~ 140 k linhas |
| `OPP_RECUPERACAO` | Distribuidor × PDV × Mês de referência | ~ 60 k linhas |

---

## 2.3 Dicionário de dados

### DIM_DATA

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveData` | INT | `Num(Date)` — chave inteira da data |
| `Data` | DATE | Data do movimento |
| `Ano` | INT | |
| `Mes` | INT | 1–12 |
| `NomeMes` | TEXT | jan, fev, … |
| `AnoMes` | TEXT | `YYYY-MM` |
| `AnoMesNum` | INT | `YYYYMM` — usado em comparações de janela |
| `Trimestre` | TEXT | `T1`…`T4` |
| `DiaDoMes` | INT | |
| `DiasNoMes` | INT | Denominador do *run rate* |
| `DiasUteisDecorridos` | INT | Dias úteis já transcorridos no mês |
| `DiasUteisTotais` | INT | Dias úteis do mês — base da projeção linear |
| `FlagMesAtual` | INT | 1 quando `AnoMesNum = vAnoMesAtual` |
| `FlagMesFechado` | INT | 1 quando o mês já foi apurado e pago |

### DIM_PDV

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChavePDV` | TEXT | `AutoNumberHash128(CNPJ_LIMPO)` |
| `CNPJ` | TEXT | 14 dígitos, sem máscara — **chave de negócio da positivação** |
| `CNPJFormatado` | TEXT | `00.000.000/0000-00` para exibição |
| `PDVNome` | TEXT | Razão social |
| `PDVFantasia` | TEXT | Nome fantasia (usado na UI) |
| `PDVCanal` | TEXT | Varejo Tradicional / Atacado / Padaria / Food Service |
| `PDVPorte` | TEXT | A / B / C / D — **dimensão calculada** (`PPT_D_PORTE_PDV`), não campo do script: depende do período selecionado |
| `PDVCidade` `PDVUF` | TEXT | |
| `PDVLatitude` `PDVLongitude` | NUM | Para o mapa da Tela 6 |
| `PDVDataCadastro` | DATE | |

### DIM_DISTRIBUIDOR

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveDistribuidor` | TEXT | Hash do CNPJ do distribuidor |
| `DistribuidorID` | TEXT | Código no ERP Tirolez |
| `DistribuidorCNPJ` | TEXT | |
| `DistribuidorNome` | TEXT | |
| `%ChaveRegiao` | TEXT | FK → DIM_REGIAO |
| `%ChaveExecutivo` | TEXT | FK → DIM_EXECUTIVO |
| `DistribuidorStatus` | TEXT | Ativo / Inativo / Suspenso |
| `DistribuidorDataInicioPPT` | DATE | Elegibilidade ao programa |

### DIM_PRODUTO

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveProduto` | TEXT | Hash do `CodProduto` |
| `CodProduto` | TEXT | SKU |
| `ProdutoDescricao` | TEXT | |
| `ProdutoCategoria` | TEXT | Categoria comercial (Queijos, Requeijão, Manteiga…) |
| `ProdutoSubcategoria` | TEXT | **Chave da regra Hero** — ex.: `Creme Ricota Light` |
| `ProdutoGramatura` | NUM | Em gramas |
| `ProdutoPesoKg` | NUM | Peso líquido por **unidade** |
| `ProdutoUnidCaixa` | NUM | Unidades por caixa |
| `ProdutoPesoCaixaKg` | NUM | `ProdutoPesoKg × ProdutoUnidCaixa` — é este campo que converte caixa → tonelada |
| `ProdutoMarca` | TEXT | |
| `FlagProdutoAtivo` | INT | |

### DIM_REGIAO

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveRegiao` | TEXT | |
| `RegiaoNome` | TEXT | Ex.: `São Paulo`, `Sul`, `Nordeste` |
| `RegiaoUF` | TEXT | |
| `RegiaoHero` | TEXT | **`SP`** ou **`DEMAIS`** — determina a composição Hero |
| `RegiaoCoordenadorID` | TEXT | FK lógica para persona Coordenador Regional |

### DIM_EXECUTIVO

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveExecutivo` | TEXT | |
| `ExecutivoID` | TEXT | Matrícula |
| `ExecutivoNome` | TEXT | |
| `ExecutivoEmail` | TEXT | Casa com `USERID` do Section Access |
| `ExecutivoCargo` | TEXT | Executivo / Coordenador Regional / Diretor |

### DIM_HERO

Dimensão **conformada por chave composta** — o mesmo SKU pertence a categorias Hero diferentes
conforme a região do distribuidor.

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveHero` | TEXT | `RegiaoHero & '\|' & ProdutoSubcategoria` |
| `CategoriaHero` | TEXT | `Cat 1 - Ricota` / `Cat 2 - Requeijao` / `Cat 3 - Fatiados` ou `Cat 3 - Manteiga` |
| `CategoriaHeroNum` | INT | 1, 2, 3 — ordenação da matriz |
| `CategoriaHeroCurta` | TEXT | `C1` / `C2` / `C3` |
| `FlagHero` | INT | 1 = SKU participa do Mix Hero |

### FACT_SELL_OUT

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveData` | INT | FK |
| `%ChavePDV` | TEXT | FK |
| `%ChaveDistribuidor` | TEXT | FK |
| `%ChaveProduto` | TEXT | FK |
| `%ChaveHero` | TEXT | FK — derivada de `RegiaoHero` do distribuidor + subcategoria do produto |
| `%ChaveDistMes` | TEXT | `DistribuidorID & '\|' & AnoMes` — liga a `FACT_PPT_MENSAL` |
| `%ChaveDistPdvMes` | TEXT | `DistribuidorID & '\|' & CNPJ & '\|' & AnoMes` — liga aos agregados |
| `QtdCaixas` | NUM | |
| `VolumeKg` | NUM | `QtdCaixas * ProdutoPesoCaixaKg` |
| `VolumeTon` | NUM | `VolumeKg / 1000` — **métrica oficial do KPI Volume** |
| `ValorSellOut` | NUM | R$ |
| `FlagVenda` | INT | **1 = linha real de venda · 0 = linha esqueleto** (ver §2.4) |
| `NumeroDocumento` | TEXT | Rastreabilidade |
| `DataIngestao` | TIMESTAMP | Carimbo de carga — auditoria de reprocessamento |

### AGG_HERO_PDV_MES

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveDistPdvMes` | TEXT | PK |
| `HeroCat1` `HeroCat2` `HeroCat3` | INT | 1 se comprou ≥1 SKU da categoria no mês |
| `HeroQtdCategorias` | INT | `HeroCat1 + HeroCat2 + HeroCat3` (0–3) |
| `FlagPdvHero` | INT | 1 quando `HeroQtdCategorias = 3` |
| `HeroStatus` | TEXT | `Completo` / `Falta 1` / `Falta 2+` / `Sem compra Hero` |
| `HeroStatusCor` | TEXT | `verde` / `amarelo` / `vermelho` / `cinza` |
| `HeroCategoriasFaltantes` | TEXT | Ex.: `Cat 3 — Fatiados` |
| `HeroVolumeTon` | NUM | Volume só de SKUs Hero |

### FACT_PPT_MENSAL

O **livro-razão da premiação**. Uma linha por distribuidor × mês.

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveDistMes` | TEXT | PK |
| `PPT_DistribuidorID` `PPT_AnoMes` `PPT_AnoMesNum` | | Redundantes por conveniência de leitura |
| `SellInValor` | NUM | Base de cálculo da premiação (R$) |
| `MetaPositivacao` | INT | PDVs a positivar |
| `MetaVolumeTon` | NUM | Toneladas |
| `MetaMixHero` | INT | PDVs Hero |
| `RealPositivacao` | INT | CNPJs únicos com `FlagVenda=1` no mês |
| `RealVolumeTon` | NUM | |
| `RealMixHero` | INT | PDVs com `FlagPdvHero=1` |
| `AtingPositivacao` `AtingVolume` `AtingMixHero` | NUM | Real / Meta (0–n) |
| `FatorPositivacao` `FatorVolume` `FatorMixHero` | NUM | 0 / 0,5 / 0,7 / 1 |
| `PremioPositivacao` `PremioVolume` `PremioMixHero` | NUM | R$ |
| `PremioTotal` | NUM | R$ — soma dos três |
| `PremioPotencialTotal` | NUM | R$ se os 3 KPIs atingissem 100% (= `SellInValor * 2%`) |
| `GapPositivacaoUn` `GapVolumeTon` `GapMixHeroUn` | NUM | Quanto falta para o **próximo degrau** |
| `GanhoProxDegrauTotal` | NUM | R$ adicionais ao cruzar o próximo degrau dos 3 KPIs |
| `FlagMesFechado` | INT | Trava de auditoria |

### OPP_POSITIVACAO

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveDistPdvMes` | TEXT | FK |
| `OppPos_CNPJ` `OppPos_PDVFantasia` | TEXT | |
| `OppPos_UltimaCompra` | DATE | |
| `OppPos_DiasSemComprar` | INT | |
| `OppPos_MesesAtivoU3M` | INT | 1–3 — em quantos dos 3 meses anteriores comprou |
| `OppPos_MediaU3MTon` | NUM | Média de volume dos últimos 3 meses |
| `OppPos_MediaU3MValor` | NUM | R$ |
| `OppPos_VolumePotencialPerdidoTon` | NUM | = `MediaU3MTon` |
| `OppPos_EraHero` | INT | 1 se o PDV era Hero em algum dos 3 meses |
| `OppPos_Score` | NUM | 0–100 — score de prioridade (§3.6 das regras) |
| `OppPos_Faixa` | TEXT | `Crítico` / `Alto` / `Médio` / `Baixo` |
| `OppPos_GapDegrauPdvs` | INT | Quantos PDVs faltam ao distribuidor para o próximo degrau |
| `OppPos_ValorDegrauTotal` | NUM | R$ que o próximo degrau de positivação paga |
| `OppPos_ValorPorPdvRecuperado` | NUM | `ValorDegrauTotal / GapDegrauPdvs` — rateio |

### OPP_RECUPERACAO

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveDistPdvMes` | TEXT | FK |
| `OppRec_CNPJ` `OppRec_PDVFantasia` `OppRec_PDVCanal` `OppRec_PDVCidade` | TEXT | |
| `OppRec_AnoMes` | TEXT | Competência de referência |
| `OppRec_MediaU3MTon` | NUM | Média dos 3 meses anteriores |
| `OppRec_VolumeMesTon` | NUM | Volume do mês de referência |
| `OppRec_QuedaTon` | NUM | `MediaU3MTon − VolumeMesTon` |
| `OppRec_QuedaPerc` | NUM | Queda relativa |
| `OppRec_GapVolumeTon` | NUM | Gap do distribuidor para o próximo degrau de volume |
| `OppRec_CoberturaDoGap` | NUM | Fração do gap que este PDV resolve sozinho |
| `OppRec_ValorPotencial` | NUM | `CoberturaDoGap × GanhoProxDegrauVolume` |
| `OppRec_Score` | NUM | 0–100 |
| `OppRec_Faixa` | TEXT | `Crítico` / `Alto` / `Médio` / `Baixo` |

### OPP_HERO

| Campo | Tipo | Descrição |
|---|---|---|
| `%ChaveDistPdvMes` | TEXT | FK |
| `OppHero_CategoriaFaltante` | TEXT | |
| `OppHero_SKURecomendado` | TEXT | SKU líder da categoria naquele canal/região |
| `OppHero_SKURecomendadoDesc` | TEXT | Texto exibido na recomendação |
| `OppHero_MotivoRecomendacao` | TEXT | `Mais vendido no canal` / `Já comprou antes` / `Maior conversão` |
| `OppHero_VolumeEstimadoTon` | NUM | Ticket médio da categoria naquele canal |
| `OppHero_CategoriasFaltantes` | INT | 1 ou 2 — esforço para completar |
| `OppHero_Score` | NUM | 0–100 |

---

## 2.4 A técnica das linhas-esqueleto (`FlagVenda = 0`)

**Problema:** metas existem para distribuidor-mês sem venda; oportunidades de positivação existem
justamente para PDVs **sem** venda no mês. Se a chave composta só nasce de linhas de venda, meta e
oportunidade ficam órfãs e desaparecem da tela.

**Solução:** após carregar as vendas, o script concatena ao `FACT_SELL_OUT` linhas de valor zero
apenas para materializar as chaves ausentes:

```qlik
CONCATENATE (FACT_SELL_OUT)
LOAD DISTINCT
    %ChaveDistMes, %ChaveDistPdvMes, %ChaveDistribuidor, %ChaveData,
    0 AS VolumeTon, 0 AS ValorSellOut, 0 AS FlagVenda
RESIDENT TMP_ESQUELETO;
```

**Contrato inegociável:** toda medida de realizado usa `{<FlagVenda={1}>}`. As master measures do
repositório já embutem esse set. Nenhuma expressão ad-hoc deve somar `VolumeTon` sem o set.

---

## 2.5 Campos derivados e onde vivem

| Campo derivado | Camada | Motivo |
|---|---|---|
| `VolumeTon` | Script (Extract) | Conversão caixa→ton depende do cadastro na data |
| `%ChaveHero` | Script (Transform) | Depende de região do **distribuidor**, não do PDV |
| `FlagPdvHero`, `HeroStatus` | Script (agregado) | Custo de `Aggr()` proibitivo em runtime |
| `Fator*`, `Premio*` | Script (FACT_PPT_MENSAL) | Auditabilidade financeira |
| `OppPos_Score`, `OppHero_Score` | Script | Ordenação estável e paginável |
| `% de atingimento com seleção parcial` | Expressão | Depende da seleção |
| `Projeção fim de mês` | Expressão (variável) | Depende da data corrente da sessão |
| `Simulação "e se"` | Mashup | Depende de input do usuário |

---

## 2.6 Relacionamentos — resumo formal

| De | Para | Cardinalidade | Chave |
|---|---|---|---|
| FACT_SELL_OUT | DIM_DATA | N:1 | `%ChaveData` |
| FACT_SELL_OUT | DIM_PDV | N:1 | `%ChavePDV` |
| FACT_SELL_OUT | DIM_DISTRIBUIDOR | N:1 | `%ChaveDistribuidor` |
| FACT_SELL_OUT | DIM_PRODUTO | N:1 | `%ChaveProduto` |
| FACT_SELL_OUT | DIM_HERO | N:1 | `%ChaveHero` |
| FACT_SELL_OUT | FACT_PPT_MENSAL | N:1 | `%ChaveDistMes` |
| FACT_SELL_OUT | AGG_HERO_PDV_MES | N:1 | `%ChaveDistPdvMes` |
| AGG_HERO_PDV_MES | OPP_POSITIVACAO | 1:0..1 | `%ChaveDistPdvMes` |
| AGG_HERO_PDV_MES | OPP_HERO | 1:0..N | `%ChaveDistPdvMes` |
| AGG_HERO_PDV_MES | OPP_RECUPERACAO | 1:0..1 | `%ChaveDistPdvMes` |
| DIM_DISTRIBUIDOR | DIM_REGIAO | N:1 | `%ChaveRegiao` |
| DIM_DISTRIBUIDOR | DIM_EXECUTIVO | N:1 | `%ChaveExecutivo` |

**Zero chaves sintéticas. Zero loops.** Validado no checklist de QA (`docs/07-qa-checklist.md` §1).
