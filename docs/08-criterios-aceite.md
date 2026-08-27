# 8. Critérios de Aceite

Formato Gherkin. Cada critério é verificável por uma pessoa sem acesso ao código.

Definição de pronto para toda história:

- [ ] Critérios de aceite verdes em UAT
- [ ] Testes de QA da área correspondente executados (`docs/07-qa-checklist.md`)
- [ ] `npm run typecheck`, `npm test` e `npm run smoke` verdes
- [ ] Responsivo verificado em 360 px, 768 px e 1440 px
- [ ] Sem `console.error` no browser
- [ ] Documentação atualizada quando a regra mudar

---

## Épico A1 — Overview PPT

### A1.1 — Ver os três KPIs do mês corrente
```gherkin
Dado que sou um distribuidor autenticado
Quando abro o cockpit sem aplicar nenhum filtro
Então vejo três cards: Positivação, Volume Sell Out e Mix Hero
E cada card mostra o percentual de atingimento com uma casa decimal
E cada card mostra o realizado e a meta na unidade correta (PDVs ou toneladas)
E o mês exibido é o mês corrente
```

### A1.2 — Saber o que falta para o próximo degrau
```gherkin
Dado que meu atingimento de Positivação é 88% com meta de 100 PDVs
Quando olho o card de Positivação
Então leio "Faltam 2 PDVs para 90% da meta — vale R$ 3.500,00"
E o valor em reais corresponde a 0,70% do sell-in multiplicado por 0,50
```

### A1.3 — Não ver "meta batida" quando ainda há gap
```gherkin
Dado que meu atingimento de Volume é 95,2%
Quando olho o card de Volume
Então NÃO leio "Meta batida"
E leio quanto falta para 100% e quanto isso vale
```

### A1.4 — Ver a premiação estimada e o teto
```gherkin
Dado que estou no cockpit
Quando olho o card de premiação
Então vejo o valor estimado em reais
E vejo o valor potencial (2% do sell-in)
E vejo o "dinheiro na mesa" — a diferença entre os dois
E vejo a premiação projetada para o fechamento do mês
```

### A1.5 — Distinguir realizado de projeção
```gherkin
Dado que estou no dia 12 de um mês com 22 dias úteis
Quando olho o gauge de premiação capturada
Então a agulha aponta o realizado
E um traço tracejado marca a projeção de fechamento
E o radar mostra polígono cheio (realizado) e polígono tracejado (projeção)
```

### A1.6 — Ver a evolução mensal contra a faixa que paga
```gherkin
Dado que existem 12 meses de histórico
Quando olho o gráfico de evolução
Então vejo uma série por KPI
E a faixa entre 90% e 100% está sombreada
E a linha de 100% está destacada em relação às demais
```

### A1.7 — Cores refletem a escada de pagamento
```gherkin
Dado um KPI em 96%
Então a cor exibida é azul e o rótulo diz "Paga 70%"
E NÃO é amarelo, porque 96% recebe premiação
Dado um KPI em 92%
Então a cor é amarela e o rótulo diz "Paga 50%"
Dado um KPI em 88%
Então a cor é vermelha e o rótulo diz "Sem premiação"
```

### A1.8 — Filtrar sem perder consistência
```gherkin
Dado que seleciono um distribuidor no filtro global
Quando navego para qualquer outra tela
Então o filtro continua aplicado
E todos os números refletem apenas aquele distribuidor
```

---

## Épico A2 — Oportunidades de Positivação

### A2.1 — Ver quem parou de comprar
```gherkin
Dado que existem PDVs que compraram nos últimos 3 meses e não compraram neste
Quando abro a tela de Oportunidades de Positivação
Então vejo a lista desses PDVs
E cada linha mostra nome, CNPJ, canal, cidade, data da última compra e dias sem comprar
E a lista vem ordenada por score de prioridade, do maior para o menor
```

### A2.2 — Entender por que um PDV está no topo
```gherkin
Dado um PDV com score 82 classificado como "Crítico"
Quando olho a linha
Então vejo a média dos últimos 3 meses em toneladas
E vejo em quantos dos 3 meses ele comprou
E vejo um ícone de troféu se ele era Mix Hero
```

### A2.3 — Saber quanto vale recuperar
```gherkin
Dado que faltam 2 PDVs para o próximo degrau de positivação
Quando olho o cabeçalho da tela
Então leio quantos PDVs faltam
E leio quanto vale recuperar os melhores da lista
E cada linha mostra o valor unitário de recuperar aquele PDV
```

### A2.4 — Excluir quem já comprou
```gherkin
Dado que um PDV comprou neste mês
Então ele NÃO aparece na lista de oportunidades de positivação
```

---

## Épico A3 — Mix Hero Navigator

### A3.1 — Ver a matriz PDV × categoria
```gherkin
Dado que estou na tela do Mix Hero Navigator
Então vejo uma linha por PDV e três colunas de categoria
E cada célula indica se o PDV comprou aquela categoria no mês
E células de compra usam ✓ verde
E células faltantes usam ✕, amarelo quando falta só uma categoria e vermelho quando faltam duas ou mais
```

### A3.2 — Começar pela fila que converte
```gherkin
Dado que abro a tela pela primeira vez
Então o filtro "Falta 1" já vem aplicado
E os PDVs a uma categoria de virar Hero aparecem primeiro
```

### A3.3 — Ver a composição correta por região
```gherkin
Dado um distribuidor de São Paulo
Então a Categoria 3 exibida é "Fatiados"
Dado um distribuidor de qualquer outra região
Então a Categoria 3 exibida é "Manteiga"
```

### A3.4 — Regra regional aplicada ao dado
```gherkin
Dado um PDV de São Paulo que comprou Ricota, Requeijão e Manteiga Com Sal
Quando olho a linha dele
Então a Categoria 3 aparece como faltante
E ele NÃO é contado como Mix Hero
```

### A3.5 — Fazer drill até o SKU
```gherkin
Dado um PDV com uma categoria faltante
Quando clico na linha
Então abre um painel lateral
E vejo quais categorias ele já comprou e qual falta
E vejo o SKU recomendado com o motivo da recomendação
E vejo quanto essa conversão vale em reais
```

### A3.6 — Localizar um PDV específico
```gherkin
Dado que digito parte do nome ou do CNPJ no campo de busca
Então a matriz filtra para os PDVs correspondentes
```

### A3.7 — Suportar volume de PDVs
```gherkin
Dado um distribuidor com 900 PDVs no mês
Quando abro a matriz
Então as primeiras linhas aparecem em menos de 4 segundos
E existe um botão para carregar mais linhas
E o número de linhas restantes é informado
```

---

## Épico A4 — Oportunidades Hero

### A4.1 — Receber a recomendação de SKU
```gherkin
Dado um PDV com uma categoria Hero faltante
Quando abro a tela de Oportunidades Hero
Então vejo um cartão com o nome do PDV
E vejo o que ele já comprou e o que falta
E vejo o SKU recomendado com descrição completa
E vejo o motivo da recomendação
```

### A4.2 — Priorizar quem converte com uma venda
```gherkin
Dado que abro a tela
Então o filtro "Só quem vira Hero com 1 venda" já vem aplicado
E cada cartão desses exibe a marca "Vira Hero com esta venda"
```

### A4.3 — Simular o impacto da lista inteira
```gherkin
Dado que a lista filtrada tem 19 PDVs convertíveis
E meu Mix Hero está em 96,7%
Quando olho o alerta no topo da tela
Então leio para quanto o Mix Hero vai se eu converter esses PDVs
E leio se isso é suficiente para o próximo degrau
E leio quanto o degrau vale em reais
E o percentual anunciado nunca ultrapassa 100% da meta
```

### A4.4 — Recomendar SKU válido para a região
```gherkin
Dado um PDV de São Paulo com a Categoria 3 faltante
Então o SKU recomendado é um fatiado
E nunca é uma manteiga
```

### A4.5 — Preferir o que o PDV já comprou
```gherkin
Dado um PDV que comprou Creme de Ricota Light nos últimos 6 meses
E que está sem a Categoria 1 neste mês
Então o SKU recomendado é Creme de Ricota Light
E o motivo exibido é "Já comprou este SKU antes"
```

---

## Épico A5 — Potencial de Recuperação

### A5.1 — Ver quem comprou abaixo da própria média
```gherkin
Dado um PDV que comprou 0,62 t neste mês contra média de 1,84 t
Quando abro a tela de Potencial de Recuperação
Então ele aparece na lista
E vejo a média dos 3 meses, o volume do mês, a queda em toneladas e em percentual
```

### A5.2 — Ignorar quedas irrelevantes
```gherkin
Dado um PDV que caiu 8% em relação à própria média
Então ele NÃO aparece na lista
Porque o corte mínimo é 20%
```

### A5.3 — Entender quanto isso cobre da meta
```gherkin
Dado que faltam 2,4 t para o próximo degrau de volume
E os PDVs em queda somam 3,4 t abaixo da média
Quando olho o card de cobertura
Então leio o percentual do gap que essa recuperação cobre
E leio que recuperá-los resolve o gap inteiro
```

### A5.4 — Ver o valor recuperável em reais
```gherkin
Quando olho o card de premiação recuperável
Então vejo um valor em reais
E esse valor corresponde à parcela do degrau de volume coberta por esses clientes
```

---

## Épico A6 — Visão Executivo

### A6.1 — Ver o retrato da carteira
```gherkin
Dado que sou um executivo autenticado
Quando abro a Visão Executivo
Então vejo quantos distribuidores estão ativos na minha carteira
E vejo a premiação projetada da carteira
E vejo quantos estão em risco
E vejo quantos estão com Mix Hero abaixo da meta
```

### A6.2 — Ver a distribuição geográfica
```gherkin
Quando olho o mapa
Então cada distribuidor aparece como um ponto na posição da sua região
E a cor indica o status de risco
E o tamanho indica a premiação potencial
E ao passar o cursor vejo nome, atingimento e premiação
```

### A6.3 — Saber onde a visita rende mais
```gherkin
Quando olho o ranking "Onde a próxima visita rende mais"
Então vejo os 5 distribuidores com maior ganho ao cruzar o próximo degrau
E cada linha mostra os três atingimentos e o valor em reais
E a ordenação NÃO é por pior atingimento, e sim por maior ganho disponível
```

### A6.4 — Enxergar quem zerou o mês
```gherkin
Dado um distribuidor da minha carteira sem nenhuma venda neste mês
Então ele aparece na tabela com 0% nos três KPIs
E com status "Risco alto"
E não desaparece da lista
```

---

## Épico A7 — Motor de Insights

### A7.1 — Receber recomendações acionáveis
```gherkin
Dado que abro o Overview
Quando olho o painel "O que fazer agora"
Então vejo no máximo 4 recomendações
E cada uma diz o que fazer, quanto falta e quanto vale
E cada uma tem um botão que leva à tela onde a ação é executada
```

### A7.2 — Alertar sobre KPI que vai zerar
```gherkin
Dado que a projeção indica que meu Mix Hero fecha em 75%
Quando olho o painel de insights
Então a primeira recomendação é o alerta de premiação em risco
E ela informa quanto sai da mesa se nada mudar
E ela informa quantos dias úteis restam
```

### A7.3 — Apontar a categoria de maior alavanca
```gherkin
Dado que 61 PDVs estão a uma categoria de virar Hero
E que a categoria mais frequente entre eles é Manteiga
Então leio quantos PDVs preciso converter em Manteiga
E leio onde isso coloca o Mix Hero
E leio qual SKU é o mais indicado
```

### A7.4 — Ordenar por impacto financeiro
```gherkin
Dado que existem mais recomendações do que o limite exibido
Então as exibidas são as de maior impacto em reais
```

### A7.5 — Reconhecer o cenário de meta batida
```gherkin
Dado que os três KPIs estão em 100% ou acima
Então recebo uma confirmação de que a premiação máxima está assegurada
E NÃO recebo recomendação de gap
```

---

## Épico A8 — Segurança

### A8.1 — Distribuidor vê apenas os próprios dados
```gherkin
Dado que estou autenticado como distribuidor
Quando abro qualquer tela
Então vejo apenas o meu código no filtro de distribuidor
E não consigo selecionar outro distribuidor
E o total de premiação exibido é apenas o meu
```

### A8.2 — Redução acontece no servidor
```gherkin
Dado que sou distribuidor
Quando manipulo a requisição enviada ao Qlik para pedir todos os distribuidores
Então continuo recebendo apenas os meus dados
```

### A8.3 — Executivo enxerga a carteira, não a base
```gherkin
Dado que sou executivo com 4 distribuidores na carteira
Então o filtro de distribuidor lista exatamente 4 valores
```

### A8.4 — Usuário sem cadastro não entra
```gherkin
Dado um usuário autenticado no tenant mas ausente da tabela de Section Access
Quando tenta abrir o app
Então o acesso é negado
```

### A8.5 — Token não é acessível ao JavaScript da página
```gherkin
Dado que estou autenticado
Quando executo document.cookie no console do browser
Então o token de acesso não aparece
```
