# 1. Arquitetura da Solução

## 1.1 Princípio arquitetural

A arquitetura é desenhada em torno de uma decisão central: **o cálculo de "o que falta fazer" não é
responsabilidade da camada de visualização**. Gap de meta, score de prioridade, categoria Hero faltante
e SKU recomendado são **materializados no script de carga**, gravados em QVDs e expostos como campos.

Motivos:

1. **Performance** — a Matrix Hero (PDV × categoria) sobre ~9k PDVs × 12 meses é inviável em
   expressão `Aggr()` no cliente. Materializada, é um `Sum()` sobre um agregado de ~110k linhas.
2. **Consistência** — a mesma definição de "PDV Hero" alimenta o KPI da Tela 1, a matriz da Tela 3,
   a recomendação da Tela 4 e o alerta do executivo na Tela 6. Uma definição, um lugar.
3. **Auditabilidade** — a premiação é dinheiro. O valor precisa ser reproduzível linha a linha
   em um QVD com carimbo de execução, não recalculado a cada renderização.

A camada de expressão fica reservada ao que **depende da seleção do usuário** (comparativos,
rankings dinâmicos, simulações "e se").

---

## 1.2 Diagrama de camadas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FONTES                                                                      │
│  ERP Tirolez (Sell-In)   │  Sell-Out distribuidores  │  Metas PPT (planilha) │
│  SAP / Protheus          │  Mtrix / NIQ collect      │  SharePoint / S3      │
│  Cadastro PDV (CNPJ)     │  Cadastro Produto/SKU     │  Hierarquia comercial │
└───────────────┬─────────────────────────────────────────────────────────────┘
                │  Data Gateway / Amazon S3 / Azure Blob  (batch diário 05:00 BRT)
┌───────────────▼─────────────────────────────────────────────────────────────┐
│  CAMADA 1 — EXTRACT (Qlik Cloud — app "PPT_01_Extract")                     │
│  · 1 QVD por tabela de origem, carga incremental por data de movimento       │
│  · Sem regra de negócio. Apenas tipagem, trim e carimbo de ingestão.         │
│  → qvd/raw/*.qvd                                                             │
└───────────────┬─────────────────────────────────────────────────────────────┘
┌───────────────▼─────────────────────────────────────────────────────────────┐
│  CAMADA 2 — TRANSFORM (app "PPT_02_Transform")                              │
│  · Deduplicação, conformação de CNPJ (14 dígitos), De-Para de produto        │
│  · Resolução da composição Hero por região  (HERO_MAP)                       │
│  · Materialização dos agregados:                                             │
│      AGG_HERO_PDV_MES · FACT_PPT_MENSAL · OPP_POSITIVACAO · OPP_HERO         │
│  → qvd/model/*.qvd                                                           │
└───────────────┬─────────────────────────────────────────────────────────────┘
┌───────────────▼─────────────────────────────────────────────────────────────┐
│  CAMADA 3 — DATA MODEL (app "PPT — Programa Por Performance Tirolez")        │
│  · Modelo estrela + Section Access + Itens Mestre                            │
│  · Binary/QVD load — carga em < 3 min                                        │
└───────────────┬─────────────────────────────────────────────────────────────┘
                │  Engine API (WebSocket, enigma.js)  ·  REST API  ·  OAuth2
┌───────────────▼─────────────────────────────────────────────────────────────┐
│  CAMADA 4 — MASHUP (Next.js 15 / React 19 / TypeScript / MUI / Nebula.js)   │
│  · SSR do shell + CSR dos objetos Qlik                                       │
│  · Motor de Insights (client-side, sobre hypercubes)                         │
│  · Deploy: Vercel / Azure Static Web Apps / container NIQ                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.3 Por que 3 apps Qlik e não 1

| Preocupação | Solução |
|---|---|
| Recarga completa leva 40+ min e trava o usuário | Extract e Transform rodam fora do app consumido |
| Section Access não pode falhar em app de desenvolvimento | Section Access aplicado apenas na Camada 3 |
| Necessidade de reprocessar histórico sem reingerir | QVDs raw imutáveis permitem replay do Transform |
| Auditoria de premiação | `qvd/model/FACT_PPT_MENSAL_YYYYMM.qvd` versionado por mês fechado |

> **Ponto de atenção operacional do canal indireto:** distribuidores reenviam sell-out corrigido
> retroativamente. O Transform sempre reprocessa os **últimos 3 meses fechados**, e o
> `FACT_PPT_MENSAL` de mês já pago é **congelado** (flag `FlagMesFechado`) — reprocessamento
> gera linha de ajuste, nunca sobrescreve valor pago. Ver `docs/03-regras-negocio.md` §3.8.

---

## 1.4 Fluxo de autenticação do mashup

```
Browser ──(1) /api/auth/login──► Next.js Route Handler
                                       │
                                       └──(2) OAuth2 Authorization Code + PKCE──► Qlik Cloud IdP
Browser ◄──(3) redirect + cookie httpOnly (access_token) ── Next.js
   │
   └──(4) enigma.js WebSocket wss://<tenant>/app/<appId>
           header: Authorization: Bearer <token>  (via qlik-web-integration-id)
                                       │
                                       └──► Section Access resolve USERID → escopo de dados
```

- **Nunca** há chave de API no bundle do cliente. O token vive em cookie `httpOnly; SameSite=Lax; Secure`.
- O escopo de dados é resolvido **no servidor Qlik**, não no front. Um distribuidor que manipule
  o request continua vendo apenas o próprio CNPJ. Ver `docs/05-seguranca.md`.

---

## 1.5 Estratégia de renderização

| Elemento | Tecnologia | Justificativa |
|---|---|---|
| KPI cards, gauges, insights | React + MUI nativo sobre hypercube | Controle total de layout e microcopy acionável |
| Evolução mensal, radar, mapa | Nebula.js (`sn-line-chart`, `sn-map`) | Reuso de objeto Qlik, drill e seleção nativos |
| Tabela de distribuidores | MUI DataGrid sobre hypercube paginado | Ordenação/filtro client-side com 40 linhas |
| Matrix Hero (batalha naval) | Componente React proprietário | Nenhum objeto Qlik nativo entrega a semântica ✅🟡🔴 com drill até SKU |
| Tabelas de oportunidade | MUI DataGrid + `useHypercube` paginado | Volume de linhas (até 9k) exige janela virtual |

**Regra:** objeto Qlik nativo quando a interação é análise; componente React quando a interação é **ação comercial**.

---

## 1.6 Contratos entre camadas

O mashup nunca consulta campo cru. Todo acesso passa por **contratos tipados** em
`mashup/src/types/` e definições de hypercube em `mashup/src/services/hypercubes/`.

```
services/qlik/client.ts        → conexão enigma.js (singleton por appId)
services/hypercubes/*.ts       → definições de hypercube versionadas
services/insights/engine.ts    → motor de recomendação (puro, testável)
hooks/useHypercube.ts          → binding React ↔ Engine API com invalidação por seleção
```

Isso permite trocar Qlik por outra engine sem reescrever a camada visual, e permite testar
o motor de insights sem tenant.

---

## 1.7 Ambientes

| Ambiente | Espaço Qlik | Dados | Consumidores |
|---|---|---|---|
| DEV | `PPT_DEV` (shared) | Mock gerado no script | Squad |
| UAT | `PPT_UAT` (shared) | Cópia mascarada de 3 meses | Key users Tirolez |
| PRD | `PPT_PRD` (managed) | Completo + Section Access | Distribuidores e Tirolez |

Promoção via `qlik-cli` / Qlik Application Automation, com os itens mestre versionados neste repositório
(`qlik/master-items/*.json`) como fonte da verdade — nunca editados direto na UI de produção.
