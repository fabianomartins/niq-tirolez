# 5. Segurança

## 5.1 Princípio

**O escopo de dados é resolvido pelo motor Qlik, nunca pelo front-end.**

O mashup não filtra por distribuidor. Ele pede o hypercube e recebe apenas o que o Section Access
permite. Um distribuidor que abra o DevTools, altere o payload do WebSocket e peça a carteira inteira
recebe exatamente os próprios dados — porque a redução acontece **antes** de qualquer hypercube
existir.

Qualquer arquitetura que dependa de um `WHERE distribuidor = X` montado no cliente é insegura por
construção. Não é o caso aqui.

---

## 5.2 Personas e escopo

| Persona | Vê | Campo de redução `DISTRIBUIDORID` | ACCESS |
|---|---|---|---|
| **Distribuidor** | Exclusivamente o próprio código | 1 linha, o próprio ID | `USER` |
| **Executivo Tirolez** | Distribuidores da própria carteira | N linhas (uma por distribuidor da carteira) | `USER` |
| **Coordenador Regional** | Todos os distribuidores da região | N linhas (uma por distribuidor da região) | `USER` |
| **Diretoria** | Tudo, sem edição | vazio (sem redução) | `USER` |
| **Administrador** | Tudo, incluindo edição do app | vazio (sem redução) | `ADMIN` |

Regra do Qlik: **campo de redução vazio = sem redução para aquele usuário**. É assim que ADMIN e
diretoria enxergam tudo sem precisar enumerar a base inteira.

---

## 5.3 Implementação

`qlik/script/10-section-access.qvs`, resumido:

```qlik
STAR IS *;

// O campo de redução precisa existir no modelo, em MAIÚSCULO.
LEFT JOIN (DIM_DISTRIBUIDOR)
LOAD DistribuidorID, Upper(DistribuidorID) AS DISTRIBUIDORID
RESIDENT DIM_DISTRIBUIDOR;

// 1. Distribuidores — um por e-mail de portal
TMP_SA:
LOAD 'USER' AS ACCESS, Upper(DistribuidorEmailPortal) AS USERID,
     Upper(DistribuidorID) AS DISTRIBUIDORID, 'DISTRIBUIDOR' AS PERSONA
RESIDENT DIM_DISTRIBUIDOR WHERE Len(Trim(DistribuidorEmailPortal)) > 0;

// 2. Executivos — a carteira inteira, uma linha por distribuidor
// 3. Coordenadores — todos os distribuidores da região
// 4. ADMIN e diretoria — DISTRIBUIDORID vazio

SECTION ACCESS;
SA_PERMISSOES: LOAD ACCESS, USERID, DISTRIBUIDORID, PERSONA RESIDENT TMP_SA;
SECTION APPLICATION;
```

### Regras operacionais inegociáveis

1. **`vAplicarSectionAccess = 1` em PRD.** O script emite `TRACE` de alerta quando está desligado.
   Item obrigatório do checklist de promoção (QA-30).
2. **Sempre incluir ao menos dois ADMIN** na tabela. Publicar um app com Section Access sem um
   ADMIN válido torna o app irrecuperável — nem o autor consegue reabrir.
3. **`USERID` sempre em maiúsculo.** O Qlik compara literalmente; `Joao@` ≠ `JOAO@`.
4. **Testar com `Reduzir dados` antes de publicar**, com uma conta de cada persona.
5. O campo `DISTRIBUIDORID` nunca aparece na UI — está marcado como `$hidden` no `99-finalize.qvs`.

### Herança da redução

A redução aplicada a `DIM_DISTRIBUIDOR` propaga pelo modelo associativo:

```
DIM_DISTRIBUIDOR (reduzida)
   → FACT_SELL_OUT       (via %ChaveDistribuidor)
      → FACT_PPT_MENSAL  (via %ChaveDistMes)
      → AGG_HERO_PDV_MES (via %ChaveDistPdvMes)
         → OPP_POSITIVACAO / OPP_HERO / OPP_RECUPERACAO
   → DIM_PDV             (via as vendas remanescentes)
```

Um distribuidor não enxerga PDVs de outro nem quando o mesmo CNPJ é atendido por dois
distribuidores: o que sobrevive à redução são as **linhas de venda dele**, e é por elas que o PDV
aparece. Este é o teste QA-32.

---

## 5.4 Autenticação do mashup

Fluxo OAuth2 **Authorization Code + PKCE**:

```
Browser ──(1) GET /api/auth/login?next=/overview──► Next.js Route Handler
                                                      │ gera code_verifier + state
                                                      │ grava em cookie httpOnly (10 min)
                                                      ▼
Browser ◄──(2) 302 para https://<tenant>/oauth/authorize?...code_challenge=S256──┘
   │
   └──(3) usuário autentica no IdP do tenant (SSO corporativo Tirolez)
   │
   ▼
Browser ──(4) GET /api/auth/callback?code=...&state=...──► Next.js
                                                            │ valida state (anti-CSRF)
                                                            │ POST /oauth/token com verifier
                                                            │ grava access_token httpOnly
                                                            ▼
Browser ◄──(5) 302 para /overview  (+ cookie de sessão) ────┘
   │
   └──(6) wss://<tenant>/app/<appId>?qlik-web-integration-id=...
           cookie enviado pelo browser · Section Access resolve o escopo
```

### Decisões e por quê

| Decisão | Motivo |
|---|---|
| **PKCE obrigatório** | O mashup é cliente público. Sem `code_verifier`, um código interceptado no redirect vira token válido para a carteira inteira do usuário |
| **Token em cookie `httpOnly`** | JavaScript da página não lê o token. XSS de terceiro não exfiltra credencial de acesso a dados de premiação |
| **`SameSite=Lax` + `Secure`** | Bloqueia envio cross-site; exige HTTPS em produção |
| **Validação de `state`** | Anti-CSRF no fluxo de autorização |
| **Redirect pós-login relativo** | `next` absoluto é recusado: open redirect é a forma mais barata de roubar um token OAuth |
| **`client_secret` sem `NEXT_PUBLIC_`** | Nunca entra no bundle do browser |
| **Cookies de uso único apagados no callback** | Antes de qualquer decisão, inclusive em caminho de erro |

### O que **não** existe no bundle do cliente

- Chave de API do tenant
- `client_secret`
- Qualquer lista de distribuidores além do que o Section Access já entregou
- Qualquer regra do tipo "se usuário X então filtrar Y"

---

## 5.5 Superfície de rede

| Origem | Destino | Protocolo | Autenticação |
|---|---|---|---|
| Browser | Mashup (Vercel / Azure SWA / container NIQ) | HTTPS | cookie de sessão |
| Browser | `wss://<tenant>/app/<appId>` | WSS | cookie + web integration id |
| Mashup (server) | `https://<tenant>/oauth/token` | HTTPS | client_id (+ secret) |
| Qlik Cloud | Fontes corporativas | via Data Gateway | credenciais no vault do gateway |

**CSP recomendada** para o host do mashup:

```
default-src 'self';
connect-src 'self' https://<tenant> wss://<tenant>;
img-src 'self' data:;
style-src 'self' 'unsafe-inline';      # Emotion injeta estilo em runtime
script-src 'self';
frame-ancestors 'none';
```

**Web Integration ID:** cadastrar em *Administração → Integrações de conteúdo web* com a lista de
origens permitidas restrita aos domínios do mashup. Origem `*` em produção é proibida.

---

## 5.6 LGPD e dado sensível

O modelo trafega **CNPJ de pessoa jurídica** e razão social — dado cadastral empresarial, não dado
pessoal na acepção da LGPD. Ainda assim:

| Item | Tratamento |
|---|---|
| CNPJ | Exibido apenas para quem tem escopo sobre aquele PDV (Section Access) |
| E-mail de contato de portal | `OMIT` no Section Access; não trafega para outras personas |
| Latitude/longitude | Do município, com dispersão — não é geolocalização de estabelecimento |
| Base de UAT | Cópia mascarada: CNPJ e razão social substituídos por valores sintéticos |
| Logs de acesso | Auditoria nativa do Qlik Cloud, retenção conforme política NIQ |
| Base sintética (mock) | Gerada por hash determinístico; nenhum dado real é derivável dela |

---

## 5.7 Segregação de ambientes

| Ambiente | Espaço | Section Access | Dados |
|---|---|---|---|
| DEV | `PPT_DEV` (shared) | Desligado | Mock gerado no script |
| UAT | `PPT_UAT` (shared) | **Ligado** | 3 meses mascarados |
| PRD | `PPT_PRD` (managed) | **Ligado** | Completo |

Promoção via `qlik-cli` com os itens mestre versionados neste repositório como fonte da verdade.
Edição direta de medida em produção é bloqueada pelo perfil de espaço gerenciado — a alteração
passa por *pull request* neste repositório e novo deploy.

---

## 5.8 Checklist de segurança antes de publicar

- [ ] `vAplicarSectionAccess = 1`
- [ ] Ao menos 2 contas `ADMIN` válidas na tabela de Section Access
- [ ] Todos os `USERID` em maiúsculo
- [ ] Teste de redução com uma conta de cada persona (QA-30 a QA-33)
- [ ] `DISTRIBUIDORID` marcado como `$hidden`
- [ ] Web Integration ID com origens restritas (sem `*`)
- [ ] CSP publicada no host do mashup
- [ ] `client_secret` ausente do bundle (`grep -r "QLIK_OAUTH_CLIENT_SECRET" .next/static/` vazio)
- [ ] Cookies com `Secure`, `httpOnly` e `SameSite=Lax`
- [ ] Espaço PRD como *managed*, não *shared*
