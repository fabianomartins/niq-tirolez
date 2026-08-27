# 7. Checklist de QA

Reprodutibilidade: com `vUseMockData = 1` a base é **determinística** (hash senoidal sobre índices,
não `Rand()`). Duas cargas consecutivas produzem exatamente os mesmos números, então todo teste
abaixo tem resultado esperado estável.

Severidade: **🔴 Bloqueia release** · **🟡 Corrige antes do go-live** · **🟢 Melhoria**

---

## 1. Modelo de dados

| # | Teste | Como verificar | Esperado | Sev |
|---|---|---|---|---|
| QA-01 | Zero chaves sintéticas | Visualizador de modelo de dados | Nenhuma tabela `$Syn` | 🔴 |
| QA-02 | Zero referências circulares | Visualizador de modelo de dados | Nenhuma tabela pontilhada / "loosely coupled" | 🔴 |
| QA-03 | Todas as tabelas conectadas | Visualizador | Apenas `QA_REJEITADOS` e `LOG_CARGA` isoladas (ilhas propositais) | 🔴 |
| QA-04 | Chaves compostas sem nulo em linha de venda | `Count({<FlagVenda={1}>} If(Len(%ChaveDistPdvMes)=0,1))` | 0 | 🔴 |
| QA-05 | Pesos do script = pesos das variáveis do app | Comparar `01-variaveis.qvs` com `variables.json` e `lib/status.ts` | 0,0070 / 0,0070 / 0,0060 nos três | 🔴 |
| QA-06 | Grão do fato é único por documento+SKU+dia | `Count(FACT_SELL_OUT) = Count(DISTINCT NumeroDocumento & '\|' & %ChaveProduto)` | igual | 🟡 |
| QA-07 | Subcategoria Hero grafada corretamente | Abrir `QA_REJEITADOS`, filtrar motivo "Subcategoria fora da composição Hero" | Nenhuma das 10 subcategorias Hero na lista | 🔴 |
| QA-08 | `DIM_PDV` sem CNPJ duplicado | `Count(DIM_PDV) = Count(DISTINCT CNPJ)` | igual | 🔴 |
| QA-09 | Toda venda tem chave Hero resolvida | Log de carga | `vQA1 = 0` | 🟡 |

## 2. Mix Hero

| # | Teste | Como verificar | Esperado | Sev |
|---|---|---|---|---|
| QA-10 | PDV Hero confere com apuração manual | Escolher 3 PDVs, listar SKUs comprados no mês, aplicar a regra à mão | `FlagPdvHero` idêntico nos 3 | 🔴 |
| QA-11 | Regra exige as 3 categorias | Filtrar `HeroQtdCategorias = 2` | `FlagPdvHero = 0` em 100% | 🔴 |
| QA-12 | Um SKU basta por categoria | PDV que comprou só `Creme Ricota` (sem Light) | `HeroCat1 = 1` | 🔴 |
| QA-13 | **SP não conta Manteiga** | Distribuidor com `RegiaoHero='SP'`, PDV que comprou Manteiga Com Sal e nada de Fatiados | `HeroCat3 = 0` | 🔴 |
| QA-14 | **Demais regiões não contam Fatiados** | Distribuidor `DEMAIS`, PDV que comprou Prato Fatiado e nada de Manteiga | `HeroCat3 = 0` | 🔴 |
| QA-15 | `HeroStatus` coerente com a contagem | Tabela `HeroQtdCategorias` × `HeroStatus` | 3→Completo, 2→Falta 1, 1→Falta 2+, 0→Sem compra Hero | 🟡 |
| QA-16 | Categorias faltantes batem com as flags | Amostra de 10 linhas com `HeroQtdCategorias = 2` | `HeroCategoriasFaltantes` cita exatamente a categoria com flag 0 | 🟡 |
| QA-17 | `RealMixHero` = soma das flags | Comparar `Sum(RealMixHero)` com `Sum(FlagPdvHero)` no mesmo recorte | igual | 🔴 |

## 3. Premiação

| # | Teste | Como verificar | Esperado | Sev |
|---|---|---|---|---|
| QA-20 | **Premiação bate com a planilha oficial** | 1 mês fechado, 5 distribuidores, conferência linha a linha | Diferença ≤ R$ 0,01 por linha | 🔴 |
| QA-21 | Teto de 2% nunca é ultrapassado | Log de carga | `vQA3 = 0` | 🔴 |
| QA-22 | Degrau em 89,99% não paga | `AtingVolume` entre 0,8999 e 0,8999 | `FatorVolume = 0` | 🔴 |
| QA-23 | Degrau em exatamente 90,00% paga 50% | `AtingVolume = 0,9` | `FatorVolume = 0,5` | 🔴 |
| QA-24 | Degrau em exatamente 95,00% paga 70% | | `Fator = 0,7` | 🔴 |
| QA-25 | Degrau em exatamente 100,00% paga 100% | | `Fator = 1,0` | 🔴 |
| QA-26 | Sem compensação entre KPIs | Distribuidor com Volume 130% e Positivação 85% | `PremioPositivacao = 0` | 🔴 |
| QA-27 | Meta zero não gera divisão por zero | Forçar `MetaMixHero = 0` | `AtingMixHero = 0`, sem erro, linha em `QA_REJEITADOS` | 🔴 |
| QA-28 | Gap para o degrau arredonda PDV para cima | Meta 37, real 33 → 90% exige 34 | `GapPositivacaoUn = 1` | 🟡 |
| QA-29 | Ganho do degrau = diferença de fator × peso × sell-in | Amostra de 5 linhas, cálculo manual | Diferença ≤ R$ 0,01 | 🔴 |

## 4. Section Access

| # | Teste | Como verificar | Esperado | Sev |
|---|---|---|---|---|
| QA-30 | `vAplicarSectionAccess = 1` em PRD | Editor de carga | Ligado | 🔴 |
| QA-31 | Distribuidor vê só o próprio código | Login como distribuidor, listbox de `DistribuidorNome` | 1 valor | 🔴 |
| QA-32 | Distribuidor não vê PDV de terceiro | Buscar na Tela 3 um CNPJ atendido por outro distribuidor | Sem resultado | 🔴 |
| QA-33 | Executivo vê a carteira, não a base | Login como executivo, contar distribuidores | = tamanho da carteira dele | 🔴 |
| QA-34 | Coordenador vê a região inteira | Login como coordenador | Todos os distribuidores da região, nenhum de outra | 🔴 |
| QA-35 | ADMIN vê tudo | Login como admin | Base completa | 🔴 |
| QA-36 | Usuário fora da tabela não abre o app | Login com conta não cadastrada | Acesso negado | 🔴 |
| QA-37 | Premiação de terceiro não vaza por medida | Como distribuidor, `Sum(PremioTotal)` sem seleção | = só a própria premiação | 🔴 |

## 5. Motor de oportunidades

| # | Teste | Como verificar | Esperado | Sev |
|---|---|---|---|---|
| QA-40 | Oportunidade de positivação exige compra na janela | Amostra de 10 linhas de `OPP_POSITIVACAO` | `MesesAtivoU3M` entre 1 e 3 em 100% | 🔴 |
| QA-41 | Oportunidade exclui quem comprou no mês | Cruzar `OPP_POSITIVACAO` com `AGG_HERO_PDV_MES` no mesmo mês | Interseção vazia | 🔴 |
| QA-42 | Score entre 0 e 100 | `Min(OppPos_Score)` e `Max(OppPos_Score)` | ≥ 0 e ≤ 100 | 🟡 |
| QA-43 | Faixa coerente com o score | Tabela faixa × score | Crítico ≥75, Alto 55–75, Médio 35–55, Baixo <35 | 🟡 |
| QA-44 | Recomendação Hero só para quem falta 1 ou 2 | `Min/Max(OppHero_CategoriasFaltantesQtd)` | entre 1 e 2 | 🔴 |
| QA-45 | SKU recomendado é da categoria faltante | Amostra de 10, cruzar com `DIM_HERO` | 100% pertencem à categoria | 🔴 |
| QA-46 | SKU recomendado é da composição da região | Amostra em SP | Nenhuma manteiga recomendada em SP | 🔴 |
| QA-47 | `ConverteSozinho` só quando falta 1 | Filtrar `OppHero_ConverteSozinho = 1` | `CategoriasFaltantesQtd = 1` em 100% | 🔴 |
| QA-48 | Recuperação exige compra no mês | Cruzar `OPP_RECUPERACAO` com presença no mês | 100% presentes | 🔴 |
| QA-49 | Recuperação respeita o corte de 20% | `Max(OppRec_QuedaPerc)` e `Min(OppRec_QuedaPerc)` | mínimo ≥ 0,20 | 🟡 |
| QA-50 | Toda oportunidade tem linha-esqueleto no fato | `Count(OPP_POSITIVACAO)` vs chaves presentes em `FACT_SELL_OUT` | 100% presentes | 🔴 |

## 6. Front-end

| # | Teste | Como verificar | Esperado | Sev |
|---|---|---|---|---|
| QA-60 | Smoke das 6 telas sem erro de runtime | `npm run build && npm start && npm run smoke` | `SMOKE OK` | 🔴 |
| QA-61 | Testes do motor de insights | `npm test` | 16 testes passando | 🔴 |
| QA-62 | Typecheck estrito | `npm run typecheck` | 0 erros | 🔴 |
| QA-63 | KPI do cockpit = medida mestre no Qlik | Mesmo filtro nos dois, comparar os 3 KPIs | Idêntico | 🔴 |
| QA-64 | Filtro global propaga a todas as telas | Selecionar 1 distribuidor, navegar pelas 6 telas | Todas refletem o filtro | 🔴 |
| QA-65 | Card não diz "Meta batida" com gap > 0 | Recorte de carteira com atingimento < 100% | Frase de gap, nunca "Meta batida" | 🟡 |
| QA-66 | Insight nunca promete acima de 100% da meta | Recorte com muitos PDVs convertíveis | Texto diz "fecha em 100%", nunca 147% | 🟡 |
| QA-67 | Responsivo a 360 px sem rolagem horizontal do body | DevTools em 360×740, as 6 telas | Só tabelas rolam, dentro do próprio container | 🟡 |
| QA-68 | Contraste ≥ 4,5:1 nos textos de status | Auditoria de contraste nos pares `STATUS_COLORS`×`STATUS_BG` | Todos aprovados | 🟡 |
| QA-69 | Cor não é o único canal de informação | Simulador de daltonismo na Tela 3 | Símbolos `✓`/`✕` legíveis | 🟡 |
| QA-70 | Navegação por teclado | Tab pelas 6 telas | Foco visível, ordem lógica, Drawer fecha com Esc | 🟡 |
| QA-71 | Sem token no bundle | `grep -r "QLIK_OAUTH_CLIENT_SECRET" .next/static/` | Vazio | 🔴 |
| QA-72 | Sem `console.log` de dado de negócio | `grep -rn "console.log" mashup/src/` | Apenas o `console.warn` do MockProvider | 🟢 |

## 7. Performance

| # | Teste | Alvo | Sev |
|---|---|---|---|
| QA-80 | Carga completa do app de modelo | < 5 min | 🟡 |
| QA-81 | Abertura da Tela 1 (cache quente) | < 3 s | 🟡 |
| QA-82 | Tela 3 com 9.000 PDVs | < 4 s até a primeira linha | 🟡 |
| QA-83 | Troca de filtro global | < 2 s para reflow completo | 🟡 |
| QA-84 | Tamanho do app em memória | < 4 GB | 🟡 |
| QA-85 | First Load JS por rota | < 400 kB | 🟢 |

## 8. Dado e operação

| # | Teste | Como verificar | Esperado | Sev |
|---|---|---|---|---|
| QA-90 | `QA_REJEITADOS` revisado a cada carga | Abrir a tabela | Nenhum motivo novo desde a última carga | 🟡 |
| QA-91 | `LOG_CARGA` com contagens plausíveis | Comparar com a execução anterior | Variação de linhas < 20% sem explicação | 🟡 |
| QA-92 | Mês fechado não muda de valor | Comparar `FACT_PPT_MENSAL` com o QVD de auditoria anterior | `PremioTotal` idêntico em `FlagMesFechado = 1` | 🔴 |
| QA-93 | Reprocessamento retroativo é sinalizado | Reenviar sell-out de mês fechado com variação > 15% | Aparece no painel de auditoria | 🟡 |
| QA-94 | Distribuidor sem venda no mês aparece | Zerar um distribuidor no mock | Aparece na tabela com 0% e status Risco alto | 🔴 |

---

## Roteiro de regressão (executar a cada release)

```bash
# 1. Qualidade de código e regra
cd mashup
npm run typecheck        # QA-62
npm test                 # QA-61
npm run build            # compila
npm start &              # sobe a build
npm run smoke            # QA-60 — as 6 telas

# 2. Qlik — recarregar com vUseMockData = 1 e conferir o log
#    QA-09, QA-21, QA-90, QA-91

# 3. Manual — 30 minutos
#    QA-13 e QA-14 (regra regional Hero)
#    QA-20 (premiação contra a planilha)
#    QA-31 a QA-33 (Section Access, uma conta por persona)
#    QA-64 (propagação de filtro)
```
