# 3. Regras de Negócio do PPT

> Este documento é a fonte normativa. Script Qlik (`qlik/script/`), medidas mestre
> (`qlik/master-items/`) e front-end (`mashup/src/lib/status.ts`) implementam o que está aqui —
> nunca o contrário. Divergência entre os três é detectada pelos testes QA-05 e QA-07.

---

## 3.1 Estrutura da premiação

A premiação total do mês equivale a **até 2% do sell-in mensal** do distribuidor, dividida em três
KPIs apurados **individualmente**. Não há compensação entre KPIs: falhar em um não é coberto por
excesso em outro.

| KPI | Peso sobre o sell-in | Unidade da meta | Fonte do realizado |
|---|---|---|---|
| Positivação | 0,70% | CNPJs únicos | `FACT_SELL_OUT` com `FlagVenda = 1` |
| Volume Sell Out | 0,70% | Toneladas | `FACT_SELL_OUT.VolumeTon` |
| Mix Hero | 0,60% | PDVs Hero | `AGG_HERO_PDV_MES.FlagPdvHero` |
| **Total** | **2,00%** | | |

## 3.2 Escalonamento

Aplicado **por KPI**, sobre o percentual de atingimento:

| Faixa de atingimento | Fator | Recebe |
|---|---|---|
| `≥ 100%` | 1,00 | 100% do peso do KPI |
| `95% – 99,99%` | 0,70 | 70% do peso do KPI |
| `90% – 94,99%` | 0,50 | 50% do peso do KPI |
| `< 90%` | 0,00 | **nada** |

```
Premio(KPI) = SellInValor × Peso(KPI) × Fator(%Ating(KPI))
PremioTotal = Premio(Positivação) + Premio(Volume) + Premio(MixHero)
```

**Consequência de desenho que a plataforma explora:** a função de pagamento é uma **escada**, não
uma rampa. Entre 89,9% e 90,0% de atingimento existe um degrau que vale metade do KPI. Todo o
cockpit é construído em torno dessa descontinuidade — daí a métrica *"quanto falta para o próximo
degrau e quanto ele vale em R$"* aparecer em cada card, cada tabela e cada insight.

**Exemplo numérico** (sell-in de R$ 1.000.000):

| KPI | Meta | Real | % Ating | Fator | Prêmio |
|---|---|---|---|---|---|
| Positivação | 100 PDVs | 88 | 88,0% | 0,00 | R$ 0 |
| Volume | 50 t | 47,6 t | 95,2% | 0,70 | R$ 4.900 |
| Mix Hero | 40 PDVs | 40 | 100,0% | 1,00 | R$ 6.000 |
| **Total** | | | | | **R$ 10.900** de R$ 20.000 |

Positivar **2 PDVs a mais** (88 → 90) leva o KPI a 90% e adiciona **R$ 3.500**. É essa frase, e não
"sua positivação está em 88%", que a Tela 1 exibe.

---

## 3.3 KPI Positivação

**Definição.** Quantidade de **CNPJs distintos** que compraram do distribuidor no mês de competência.

Regras:

1. A chave é o **CNPJ com 14 dígitos, sem máscara**. Registro com tamanho diferente é descartado e
   logado em `QA_REJEITADOS` (`04-dimensoes.qvs`).
2. Um CNPJ conta **uma vez por mês**, independentemente do número de notas ou de SKUs.
3. Só conta linha com `FlagVenda = 1`. Linhas-esqueleto (`FlagVenda = 0`) existem para sustentar
   chaves de meta e de oportunidade e **nunca** entram no numerador.
4. Devolução integral (volume líquido ≤ 0 no mês) **não** positiva. Implementado no filtro de
   ingestão do sell-out.
5. PDV cadastrado mas sem compra não positiva — é justamente o insumo da Tela 2.

```
RealPositivacao = Count(DISTINCT %ChavePDV)  onde FlagVenda = 1, por distribuidor × mês
```

---

## 3.4 KPI Volume Sell Out

**Definição.** Toneladas vendidas pelo distribuidor ao varejo no mês.

```
VolumeKg  = QtdCaixas × ProdutoPesoCaixaKg
VolumeTon = VolumeKg / 1000
```

Regras:

1. A conversão caixa → kg usa o **cadastro de produto vigente na data da carga**. Mudança de
   gramatura não reescreve histórico já apurado (`FlagMesFechado = 1`).
2. Todos os SKUs contam, Hero e não-Hero.
3. Volume negativo (devolução) é somado com sinal — o KPI mede volume líquido.

---

## 3.5 KPI Mix Hero

**Definição.** Quantidade de PDVs classificados como **Mix Hero** no mês.

### Composição por região

A Categoria 3 muda conforme a região do **distribuidor** (não a do PDV):

| Categoria | São Paulo (`RegiaoHero = 'SP'`) | Demais regiões (`RegiaoHero = 'DEMAIS'`) |
|---|---|---|
| **Categoria 1 — Ricota** | Creme Ricota · Creme Ricota Light | Creme Ricota · Creme Ricota Light |
| **Categoria 2 — Requeijão** | Requeijão · Requeijão Light | Requeijão · Requeijão Light |
| **Categoria 3** | **Fatiados:** Mussarela Fatiada · Mussarela Light · Prato Fatiado · Prato Light | **Manteiga:** Manteiga Com Sal · Manteiga Sem Sal |

### A regra

> Um PDV é **MIX HERO** no mês quando comprou **pelo menos 1 SKU de cada uma das 3 categorias**.
> Não precisa comprar todos os SKUs da categoria.

```
FlagPdvHero = 1  ⟺  HeroCat1 = 1 AND HeroCat2 = 1 AND HeroCat3 = 1
```

Pseudocódigo da apuração (implementado em `07-agregado-hero.qvs`):

```
para cada (distribuidor, PDV, mês):
    composicao ← RegiaoHero do distribuidor
    cat1 ← existe venda de SKU cuja subcategoria ∈ Categoria1[composicao] ? 1 : 0
    cat2 ← existe venda de SKU cuja subcategoria ∈ Categoria2[composicao] ? 1 : 0
    cat3 ← existe venda de SKU cuja subcategoria ∈ Categoria3[composicao] ? 1 : 0
    qtd  ← cat1 + cat2 + cat3
    hero ← (qtd = 3)
    status ← qtd = 3 → 'Completo'
             qtd = 2 → 'Falta 1'
             qtd ≥ 1 → 'Falta 2+'
             senão   → 'Sem compra Hero'
```

### Consequência regional que precisa estar explícita

Um distribuidor **de São Paulo** que vende Manteiga Com Sal para um PDV **não avança** o Mix Hero
daquele PDV — manteiga não compõe a Categoria 3 em SP. A venda é real, entra em Volume e em
Positivação, e simplesmente não conta para o Mix. O contrário também vale no Sul com Fatiados.

O script materializa esse caso de propósito na base mock (slot 6 do gerador) para que ele seja
testável, e a chave `%ChaveHero = 'SP|Manteiga Com Sal'` não existe em `DIM_HERO`, resolvendo para
`'NAOHERO'`.

---

## 3.6 Oportunidade de Positivação (Tela 2)

**Definição.** PDV que comprou em **pelo menos um** dos 3 meses anteriores ao mês de referência e
**não comprou** no mês de referência.

```
OportunidadePositivacao(dist, pdv, M) ⟺
      ∃ m ∈ {M-1, M-2, M-3} : comprou(dist, pdv, m)
  AND ¬comprou(dist, pdv, M)
```

Campos derivados:

| Campo | Cálculo |
|---|---|
| `MesesAtivoU3M` | quantos dos 3 meses tiveram compra (1 a 3) |
| `MediaU3MTon` | `Σ volume(M-1..M-3) / 3` — divide por **3**, não pelos meses ativos. Leitura conservadora do volume mensal que o PDV representava |
| `UltimaCompra` | maior data de compra na janela |
| `DiasSemComprar` | data de referência − `UltimaCompra`. Data de referência = hoje no mês corrente, fim do mês nos meses fechados |
| `EraHero` | 1 se o PDV foi Mix Hero em algum dos 3 meses |
| `VolumePotencialPerdidoTon` | `= MediaU3MTon` |

### Score de prioridade (0–100)

```
Score = 40 × sVolume + 25 × sRecencia + 20 × sFrequencia + 15 × sHero

sVolume     = min(1, MediaU3MTon / maiorMediaDoDistribuidorNoMes)
sRecencia   = max(0, 1 − min(1, DiasSemComprar / 90))
sFrequencia = MesesAtivoU3M / 3
sHero       = EraHero (0 ou 1)
```

| Faixa | Score |
|---|---|
| Crítico | ≥ 75 |
| Alto | 55 – 74,9 |
| Médio | 35 – 54,9 |
| Baixo | < 35 |

**Por que normalizar dentro do distribuidor e não na base inteira:** um PDV de 300 kg é grande para
um distribuidor de interior e pequeno para um de capital. Normalizar globalmente enterraria toda a
carteira do distribuidor pequeno no fim da fila, e a fila dele é a única que o gerente dele trabalha.

---

## 3.7 Oportunidade Hero (Telas 3 e 4)

**Universo.** PDVs com `1 ≤ HeroQtdCategorias ≤ 2` — ou seja, já compram algo Hero mas não fecham o
mix. PDV com zero categorias é problema de **positivação**, não de mix, e é tratado na Tela 2.

Uma linha por **categoria faltante**.

### Escolha do SKU recomendado

Prioridade, na ordem:

1. **SKU que o próprio PDV já comprou** naquela categoria nos últimos 6 meses. Já girou na loja,
   já tem espaço na gôndola, já tem preço formado.
2. **SKU líder em penetração** naquela categoria, região e canal — o mais aceito por lojas parecidas.
3. **SKU líder em penetração** na região (fallback quando o canal tem amostra pequena).

Penetração (nº de PDVs distintos que compraram), **não volume**: para completar mix o que importa é
qual SKU o canal aceita, não qual gera mais tonelada.

### Score de prioridade (0–100)

```
Score = 45 × sEsforco + 35 × sVolume + 20 × sAfinidade

sEsforco   = 1,0 se falta apenas 1 categoria (a venda converte o PDV sozinha)
             0,4 se faltam 2
sVolume    = min(1, VolumeMensalDoPdvTon / 0,5)
sAfinidade = 1 se o PDV já comprou essa categoria antes, 0 caso contrário
```

### Valor de uma conversão

```
ValorPorConversao = GanhoProxDegrauMixHero / GapMixHeroUn      (se GapMixHeroUn > 0)
```

Rateio honesto e assumido: o degrau paga `X` e faltam `N` PDVs Hero, então cada conversão vale
`X/N` — **e só vale de verdade se as outras `N−1` também acontecerem**. A UI diz isso; não vende a
ilusão de ganho marginal linear em uma função que é escada.

---

## 3.8 Oportunidade de Recuperação (Tela 5)

**Definição.** PDV que **comprou** no mês de referência, porém abaixo da própria média histórica.

```
OportunidadeRecuperacao(dist, pdv, M) ⟺
      comprou(dist, pdv, M)
  AND MediaU3MTon > 0
  AND volume(M) < MediaU3MTon × (1 − 0,20)
```

O corte de 20% é parametrizável em `vQuedaMinimaRecuperacao`.

```
QuedaTon        = MediaU3MTon − VolumeMesTon
QuedaPerc       = QuedaTon / MediaU3MTon
CoberturaDoGap  = min(1, QuedaTon / GapVolumeTon)
ValorPotencial  = CoberturaDoGap × GanhoProxDegrauVolume

Score = 60 × min(1, QuedaTon / maiorQuedaDoDistribuidorNoMes) + 40 × min(1, QuedaPerc)
```

Os dois termos medem coisas diferentes de propósito: o absoluto é o que **move o KPI**; o relativo é
o que **indica cliente em fuga**. Um PDV que caiu 90% de uma base pequena não salva a meta, mas está
prestes a virar oportunidade de positivação no mês seguinte.

---

## 3.9 Projeção de fechamento

```
Projetado(KPI) = Realizado(KPI) / DiasUteisDecorridos × DiasUteisTotais
AtingProjetado = Projetado / Meta
```

Dias úteis excluem sábados, domingos e os feriados nacionais listados em `03-calendario.qvs`.
Em mês fechado, `DiasUteisDecorridos = DiasUteisTotais`, logo projeção = realizado.

**Status de risco do distribuidor** olha a **projeção**, não o realizado:

```
FatorProjMin = min(Fator(AtingProjPos), Fator(AtingProjVol), Fator(AtingProjHero))

FatorProjMin = 0  → 'Risco alto'    (algum KPI fecha sem pagar nada)
FatorProjMin < 1  → 'Atenção'       (algum KPI fecha abaixo de 100%)
senão             → 'No alvo'
```

Avisar no dia 30 que o distribuidor perdeu a premiação não é alerta — é obituário.

---

## 3.10 Reprocessamento e congelamento de competência

Realidade operacional do canal indireto: distribuidor reenvia sell-out corrigido depois do
fechamento. Isso é legítimo na maioria das vezes e ocasionalmente é *gaming* para alcançar meta.

Regras:

1. O Transform reprocessa sempre os **3 últimos meses**.
2. Competência com `FlagMesFechado = 1` **já foi paga**. Reprocessamento não sobrescreve o valor
   pago: gera linha de ajuste e o QVD de auditoria
   `FACT_PPT_MENSAL_<execID>.qvd` preserva a versão anterior.
3. Toda linha de fato carrega `DataIngestao`, permitindo reconstruir "o que sabíamos quando pagamos".
4. Variação de sell-out acima de ±15% em competência fechada é sinalizada no painel de auditoria
   para conferência humana antes de qualquer recálculo de premiação.

**Nenhuma correção retroativa é aplicada automaticamente a valor já pago.** A decisão é do comitê do
programa; a plataforma fornece a evidência.

---

## 3.11 Elegibilidade

| Condição | Efeito |
|---|---|
| `DistribuidorStatus = 'Ativo'` | Elegível ao programa |
| `DistribuidorStatus ∈ {Inativo, Suspenso}` | Fora da apuração; mantido no histórico |
| `DistribuidorDataInicioPPT > fim da competência` | Fora da apuração daquele mês |
| Meta ausente ou ≤ 0 em qualquer KPI | Atingimento tratado como 0 e a competência é logada em `QA_REJEITADOS`. **Nunca** divide por zero, e nunca paga por meta inexistente |
