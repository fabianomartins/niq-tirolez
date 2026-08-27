# PPT — Programa Por Performance Tirolez

**Sales Execution Cockpit** para o programa permanente de remuneração de distribuidores da Tirolez.

> Não é um dashboard de monitoramento. É uma plataforma que responde, para cada distribuidor,
> **o que falta**, **onde atuar**, **qual PDV visitar**, **qual SKU vender**, **quanto isso aproxima da meta**
> e **quanto isso aumenta a premiação em R$**.

---

## O programa em uma linha

Até **2% do sell-in mensal** distribuídos em 3 KPIs, apurados individualmente:

| KPI | Peso sobre Sell-In | Unidade de meta |
|---|---|---|
| Positivação | 0,70% | CNPJs únicos positivados |
| Volume Sell Out | 0,70% | Toneladas |
| Mix Hero | 0,60% | PDVs Hero |

Escalonamento por KPI: `≥ 90% → 50%` · `≥ 95% → 70%` · `≥ 100% → 100%` · `< 90% → 0%`

---

## Estrutura do repositório

```
.
├── docs/                         # Especificação funcional e técnica completa
│   ├── 01-arquitetura.md         # Arquitetura da solução (camadas, fluxo, deploy)
│   ├── 02-modelo-dados.md        # Modelo estrela, chaves, campos derivados
│   ├── 03-regras-negocio.md      # Regras PPT formalizadas + pseudocódigo
│   ├── 04-wireframes.md          # Wireframes detalhados das 6 telas
│   ├── 05-seguranca.md           # Section Access, RLS, OAuth, personas
│   ├── 06-roadmap.md             # MVP (8 semanas) + Fase 2
│   ├── 07-qa-checklist.md        # Checklist de QA (dado, cálculo, UI, segurança)
│   ├── 08-criterios-aceite.md    # Critérios de aceite por tela (Gherkin)
│   ├── 09-backlog-jira.csv       # Backlog importável no Jira
│   └── 10-motor-insights.md      # Motor de recomendações — regras e templates
│
├── qlik/
│   ├── script/                   # Script de carga Qlik Cloud (modular, .qvs)
│   │   ├── 00-main.qvs           # Orquestrador — cole isto na aba Main
│   │   ├── 01-variaveis.qvs
│   │   ├── 02-fontes.qvs         # LIB CONNECT reais + gerador de dados mock
│   │   ├── 03-calendario.qvs
│   │   ├── 04-dimensoes.qvs
│   │   ├── 05-hero-map.qvs       # Composição Hero por região
│   │   ├── 06-fato-sellout.qvs
│   │   ├── 07-agregado-hero.qvs
│   │   ├── 08-fato-ppt-mensal.qvs
│   │   ├── 09-oportunidades.qvs  # Positivação + Hero + Recuperação
│   │   ├── 10-section-access.qvs
│   │   ├── 99-finalize.qvs
│   │   └── ppt-script-completo.qvs   # DERIVADO: as 12 abas em um arquivo só,
│   │                                 # para colar de uma vez no editor de carga
│   ├── master-items/             # Medidas, dimensões, variáveis, bookmarks (JSON)
│   └── tools/deploy-master-items.mjs   # Deploy via Qlik Cloud REST/Engine API
│
└── mashup/                       # Aplicação Next.js 15 + TypeScript + MUI + Nebula.js
    └── src/{app,components,services,hooks,types,lib}
```

---

## Quick start

### 1. Qlik Cloud

1. Crie um app `PPT — Programa Por Performance Tirolez`.
2. **Preparar → Editor de carregamento de dados**, selecione tudo na aba Main e cole
   `qlik/script/ppt-script-completo.qvs` por cima. As linhas `///$tab` são a marcação de
   aba do Qlik — o script roda igual em uma aba só, e ao reabrir o editor o Qlik
   normalmente re-divide nas 12 abas.
   *Alternativa:* colar cada `NN-*.qvs` em uma aba homônima, na ordem que `00-main` documenta.
3. **Salvar → Carregar dados.** No modo padrão (`vUseMockData = 1`) não é preciso nenhuma
   conexão: o script gera uma base sintética consistente (18 meses, 40 distribuidores, 4k PDVs).
4. Para produção: `SET vUseMockData = 0;` na seção `01 - Variaveis` e configure as conexões
   em `02 - Fontes`.
5. **Só depois da carga**, publique os itens mestre — eles referenciam campos que só existem
   com o modelo carregado: `node qlik/tools/deploy-master-items.mjs --app <APP_ID>`.

### 2. Mashup

```bash
cd mashup
npm install
cp .env.example .env.local     # preencha tenant, appId e client id OAuth
npm run dev                    # http://localhost:3000
```

Sem tenant configurado a aplicação sobe em **modo mock** (`NEXT_PUBLIC_QLIK_MOCK=true`),
servindo os mesmos contratos de dados a partir de `src/services/mock/`. Todas as telas,
o motor de insights e a Matrix Hero funcionam integralmente offline.

---

## As 6 telas

| # | Tela | Pergunta que responde |
|---|---|---|
| 1 | Overview PPT | Onde estou hoje e quanto vou receber? |
| 2 | Oportunidades de Positivação | Quais PDVs sumiram e quanto valem? |
| 3 | Mix Hero Navigator | Qual PDV está incompleto e em qual categoria? |
| 4 | Oportunidades Hero | Qual SKU vender, para quem, e quanto rende? |
| 5 | Potencial de Recuperação | Quem está abaixo da própria média histórica? |
| 6 | Visão Executivo | Qual distribuidor da minha carteira está em risco? |

Detalhamento em [`docs/04-wireframes.md`](docs/04-wireframes.md).

---

## Convenções de status (identidade visual Tirolez)

| Cor | Token | Significado | Faixa |
|---|---|---|---|
| 🟢 Verde | `status.success` `#1B7A3E` | Meta atingida | `≥ 100%` |
| 🔵 Azul | `status.info` `#0F6FB5` | Faixa premiada | `95% – 99,9%` |
| 🟡 Amarelo | `status.warning` `#E8A317` | Risco | `90% – 94,9%` |
| 🔴 Vermelho | `status.danger` `#C0392B` | Abaixo da meta (sem premiação) | `< 90%` |
