# 6. Roadmap

## 6.1 MVP — 8 semanas

**Objetivo do MVP:** um distribuidor abre o cockpit no dia 12 do mês, entende em 30 segundos quanto
está deixando na mesa, e sai com uma lista de PDVs para visitar naquela semana.

Se a Tela 1 e a Tela 3 estiverem prontas e corretas, o MVP entrega valor mesmo sem as demais.
As duas são, por isso, as primeiras a fechar.

| Semana | Entrega | Critério de saída |
|---|---|---|
| **1** | Descoberta e contratos de dados | Layout de arquivo de sell-out, metas e sell-in acordados com TI Tirolez. Composição Hero validada por escrito com o time comercial |
| **2** | Camada Extract + Transform | QVDs raw e model gerados. `AGG_HERO_PDV_MES` batendo com apuração manual em 3 distribuidores (QA-10) |
| **3** | `FACT_PPT_MENSAL` + itens mestre | Premiação de 1 mês fechado conferida linha a linha contra a planilha oficial do programa (QA-20). **Marco crítico** |
| **4** | Section Access + shell do mashup | Login OAuth funcionando; 3 personas testadas; navegação e filtros globais |
| **5** | **Tela 1 — Overview** | Aceite A1.1 a A1.8 |
| **6** | **Tela 3 — Mix Hero Navigator** + motor de oportunidades Hero | Aceite A3.1 a A3.7 |
| **7** | **Telas 2, 4 e 5** — positivação, recomendações e recuperação | Aceite A2, A4, A5 |
| **8** | **Tela 6 — Executivo** + motor de insights + UAT | Aceite A6; 5 key users em UAT; checklist de QA 100% |

### Escopo do MVP

**Dentro:**
- 6 telas conforme `docs/04-wireframes.md`
- 3 KPIs com escalonamento, gaps e premiação auditável
- Motor de oportunidades (positivação, Hero, recuperação)
- Motor de insights com 8 regras
- Section Access com 5 personas
- Base sintética para DEV/UAT/treinamento
- Responsivo até 360 px

**Fora (explicitamente):**
- App mobile nativo
- Notificação push / e-mail
- Registro de visita e check-in
- Integração com força de vendas
- Simulador interativo de cenário ("e se eu vender X")
- Mapa cartográfico com geometria de UF
- Metas por sub-região ou por canal

### Riscos do MVP

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Cadastro de subcategoria de produto inconsistente quebra o Mix Hero silenciosamente | **Alta** | **Alto** | Teste QA-07 roda a cada carga e lista toda subcategoria fora da composição Hero. Semana 2 dedicada a saneamento |
| Sell-out chega com CNPJ mascarado ou com 11 dígitos | Alta | Médio | Normalização com `KeepChar` + log `QA_REJEITADOS` + alçada de correção com o distribuidor |
| Meta mensal chega por planilha, com atraso | Alta | Médio | Ingestão tolerante: competência sem meta entra com atingimento zero e é logada, não derruba a carga |
| Reprocessamento retroativo altera mês já pago | Média | **Alto** | `FlagMesFechado` + QVD de auditoria versionado (§3.10) |
| Volume real (18 M linhas) degrada a Tela 3 | Média | Médio | Agregado materializado + paginação. Teste de carga na semana 6 |
| Divergência entre premiação do cockpit e do financeiro | Média | **Alto** | Conferência linha a linha na semana 3, antes de qualquer tela |

---

## 6.2 Fase 2 — 3 a 6 meses após o MVP

Ordenada por razão *impacto sobre execução comercial / esforço*.

### 2.1 Roteiro de visita exportável — **prioridade máxima**

Hoje o cockpit diz qual PDV visitar; o vendedor anota no papel.

- Seleção múltipla nas Telas 2, 3 e 5
- Exportação para XLSX e PDF com CNPJ, endereço, SKU recomendado e valor da conversão
- Envio por e-mail ao supervisor da rota
- *Deep link* por PDV para abrir direto no cockpit

**Por que primeiro:** é a menor distância entre a recomendação e a ação. Todo o resto da Fase 2
depende de o roteiro existir para medir se a recomendação virou venda.

### 2.2 Fechamento do laço — a recomendação virou venda?

- Marcar recomendação como *aceita / recusada / não visitada*
- Conferir no mês seguinte se o PDV recomendado comprou o SKU recomendado
- **Taxa de conversão por SKU, canal e vendedor**
- Recalibrar o score de recomendação com o resultado observado

Este é o item que transforma o motor de heurística em motor de aprendizado. Sem ele, o score
permanece uma opinião bem informada para sempre.

### 2.3 Alertas proativos

- Regra: "distribuidor entrou em `Risco alto`" → e-mail ao executivo no mesmo dia
- Regra: "PDV Hero há 6 meses parou de comprar" → alerta ao supervisor
- Digest semanal por persona, com as 3 ações de maior valor
- Canal: e-mail (Qlik Application Automation) e Microsoft Teams

### 2.4 Simulador de cenário

Painel "e se": arrastar sliders de PDVs positivados, toneladas e conversões Hero e ver a premiação
recalcular em tempo real. A função `simularPositivacao()` em `engine.ts` já é a base.

Uso concreto: reunião mensal de carteira, decidindo onde alocar o esforço da equipe.

### 2.5 Mapa cartográfico real

Substituir `MapaRegional` (projeção equirretangular) por `sn-map` do Nebula com camada de UF e
município, densidade de PDVs Hero por região e camada de rota.

### 2.6 Metas por canal e por sub-região

Hoje a meta é por distribuidor. Distribuidores com mix de canal muito diferente competem em
condições diferentes. Requer mudança no layout de meta e no grão de `FACT_PPT_MENSAL`.

### 2.7 Score preditivo de churn de PDV

Substituir a regra "não comprou este mês" por um modelo que estime probabilidade de abandono nos
próximos 60 dias a partir de recência, frequência, valor, tendência e sazonalidade.

Entrega: mesma Tela 2, coluna extra de probabilidade. **Só depois de 2.2** — sem rótulo observado
(o PDV voltou ou não?) não há como treinar nem validar.

### 2.8 Histórico de premiação paga

Tela de extrato: o que foi apurado, o que foi pago, o que foi ajustado, com o QVD de auditoria por
trás. Reduz o atrito recorrente de "o número do dashboard não bate com o meu pagamento".

### 2.9 Modo offline / PWA

O vendedor em rota costuma estar em área sem sinal. Cache do roteiro do dia via service worker.

---

## 6.3 O que deliberadamente **não** está no roadmap

| Item | Por quê |
|---|---|
| Chatbot de linguagem natural sobre o modelo | O Insight Advisor do Qlik já cobre exploração livre. Uma camada de chat própria adiciona superfície de erro sem responder melhor "qual PDV visitar" |
| Gamificação com ranking público entre distribuidores | Programa de remuneração com exposição pública de desempenho gera atrito comercial e incentiva *gaming* de dado |
| Recomendação de SKU por deep learning no MVP | A heurística de penetração por canal resolve a maior parte e é explicável ao vendedor. Modelo caixa-preta que ninguém sabe justificar não é seguido em campo |
| Escrita de volta no ERP a partir do cockpit | Ferramenta de análise não emite pedido. Risco operacional desproporcional ao ganho |
