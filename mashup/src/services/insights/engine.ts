/**
 * MOTOR DE RECOMENDAÇÕES
 *
 * Função pura: recebe o estado do PPT e as filas de oportunidade, devolve
 * frases acionáveis ordenadas por impacto em reais.
 *
 * Regra editorial de toda frase gerada aqui:
 *   1. Dizer O QUE FAZER (verbo no infinitivo ou imperativo).
 *   2. Dizer QUANTO FALTA (número na unidade que o vendedor usa).
 *   3. Dizer QUANTO VALE (R$ ou % de meta).
 * Frase que só descreve o passado ("sua positivação caiu 8%") não entra.
 *
 * Sem dependência de React ou de Qlik — por isso é testável com `node --test`.
 */

import { proximoDegrau } from '@/lib/status';
import { inteiro, moeda, percentual, pluralizar, toneladas } from '@/lib/format';
import type {
  Insight,
  OportunidadePositivacao,
  OportunidadeRecuperacao,
  PptSummary,
  RecomendacaoHero,
} from '@/types/ppt';

export interface EntradaInsights {
  resumo: PptSummary | null;
  oportunidadesPositivacao: OportunidadePositivacao[];
  oportunidadesHero: RecomendacaoHero[];
  oportunidadesRecuperacao: OportunidadeRecuperacao[];
}

/** Quantos dias úteis ainda restam no mês. */
function diasRestantes(resumo: PptSummary): number {
  return Math.max(0, resumo.diasUteisTotais - resumo.diasUteisDecorridos);
}

/* -------------------------------------------------------------------------- */
/* Regras                                                                      */
/* -------------------------------------------------------------------------- */

function regraGapPositivacao(e: EntradaInsights): Insight[] {
  const r = e.resumo;
  if (!r) return [];
  const kpi = r.kpis.positivacao;
  // Em carteira, `proxDegrau` é 0 por definição (cada distribuidor tem o seu),
  // mas gap e ganho continuam somáveis — por isso a guarda olha os dois.
  if (kpi.gapProxDegrau <= 0 || kpi.ganhoProxDegrau <= 0) return [];

  const alvo = r.consolidado
    ? `o próximo degrau de cada um dos ${inteiro(r.qtdDistribuidores)} distribuidores`
    : `${percentual(kpi.proxDegrau, 0)} da meta de positivação`;

  return [
    {
      id: 'gap-positivacao',
      peso: 1000 + kpi.ganhoProxDegrau,
      severidade: kpi.ating < 0.9 ? 'critico' : 'atencao',
      kpi: 'positivacao',
      titulo: 'Positivação — próximo degrau',
      texto:
        `Faltam ${pluralizar(kpi.gapProxDegrau, 'PDV', 'PDVs')} para atingir ${alvo}. ` +
        `Cruzar esse degrau vale ${moeda(kpi.ganhoProxDegrau)}.`,
      impactoReais: kpi.ganhoProxDegrau,
      acaoHref: '/positivacao',
      acaoLabel: 'Ver PDVs a recuperar',
    },
  ];
}

function regraPdvsSumiram(e: EntradaInsights): Insight[] {
  const lista = e.oportunidadesPositivacao;
  if (lista.length === 0) return [];

  const volume = lista.reduce((s, o) => s + o.volumePotencialPerdidoTon, 0);
  const criticos = lista.filter((o) => o.prioridade === 'Critico').length;
  const gap = e.resumo?.kpis.positivacao.gapProxDegrau ?? 0;

  const complemento =
    gap > 0 && lista.length >= gap
      ? ` Recuperar ${pluralizar(gap, 'deles', 'deles')} já fecha o gap do próximo degrau.`
      : '';

  return [
    {
      id: 'pdvs-sumiram',
      peso: 900 + volume,
      severidade: criticos > 0 ? 'critico' : 'atencao',
      kpi: 'positivacao',
      titulo: 'Clientes que pararam de comprar',
      texto:
        `Existem ${pluralizar(lista.length, 'PDV', 'PDVs')} que compraram nos últimos 3 meses ` +
        `e ainda não compraram neste mês, somando ${toneladas(volume)} de volume histórico mensal.` +
        complemento,
      impactoReais: lista.reduce((s, o) => s + o.mediaU3MValor, 0),
      acaoHref: '/positivacao',
      acaoLabel: 'Abrir lista priorizada',
    },
  ];
}

function regraHeroFalta1(e: EntradaInsights): Insight[] {
  const converteveis = e.oportunidadesHero.filter((o) => o.converteSozinho);
  if (converteveis.length === 0) return [];

  const r = e.resumo;
  const kpi = r?.kpis.mixHero;

  // Agrupa por categoria faltante para dizer QUAL categoria destrava mais PDVs.
  const porCategoria = new Map<string, RecomendacaoHero[]>();
  for (const o of converteveis) {
    const arr = porCategoria.get(o.categoriaFaltante);
    if (arr) arr.push(o);
    else porCategoria.set(o.categoriaFaltante, [o]);
  }
  const [categoriaTop, itens] = [...porCategoria.entries()].sort((a, b) => b[1].length - a[1].length)[0]!;

  const insights: Insight[] = [];

  // Insight principal: qual categoria vender e onde isso coloca o Mix Hero.
  if (kpi && kpi.meta > 0) {
    const categoriaLimpa = categoriaTop.replace(/^Cat \d+ - /, '');
    const skuMaisIndicado = itens.slice().sort((a, b) => b.score - a.score)[0]?.skuDescricao;

    // Quantas conversões bastam para fechar 100% — nunca prometer mais que isso.
    // "Você alcança 147% da meta" é ruído: ninguém trabalha para passar do teto.
    const faltamPara100 = Math.max(0, Math.ceil(kpi.meta) - kpi.real);
    const bastam = faltamPara100 > 0 && itens.length >= faltamPara100;
    const novoAting = Math.min(1, (kpi.real + itens.length) / kpi.meta);

    const corpo = bastam
      ? `Vendendo ${categoriaLimpa} para ${pluralizar(faltamPara100, 'PDV', 'PDVs')} ` +
        `dos ${inteiro(itens.length)} disponíveis nesta categoria, o Mix Hero fecha em 100% da meta. `
      : `Vendendo ${categoriaLimpa} para ${pluralizar(itens.length, 'PDV', 'PDVs')} ` +
        `você alcança ${percentual(novoAting, 0)} do Mix Hero. `;

    insights.push({
      id: 'hero-categoria-alavanca',
      peso: 1200 + (kpi.ganhoProxDegrau || 0),
      severidade: kpi.ating < 0.9 ? 'critico' : 'atencao',
      kpi: 'mixHero',
      titulo: 'A categoria que mais destrava Mix Hero',
      texto: corpo + (skuMaisIndicado ? `SKU mais indicado: ${skuMaisIndicado}.` : ''),
      impactoReais: kpi.ganhoProxDegrau,
      acaoHref: '/oportunidades-hero',
      acaoLabel: 'Ver recomendações por PDV',
    });
  }

  // Insight secundário: o tamanho da fila mais barata do programa.
  insights.push({
    id: 'hero-falta1',
    peso: 800 + converteveis.length,
    severidade: 'atencao',
    kpi: 'mixHero',
    titulo: 'PDVs a um SKU de virar Hero',
    texto:
      `${inteiro(converteveis.length)} PDVs estão a UMA categoria de completar o Mix Hero. ` +
      `Cada conversão vale em média ` +
      `${moeda(
        converteveis.reduce((s, o) => s + o.valorPorConversao, 0) / Math.max(1, converteveis.length),
      )}.`,
    acaoHref: '/mix-hero',
    acaoLabel: 'Abrir o Mix Hero Navigator',
  });

  return insights;
}

function regraGapVolume(e: EntradaInsights): Insight[] {
  const r = e.resumo;
  if (!r) return [];
  const kpi = r.kpis.volume;
  if (kpi.gapProxDegrau <= 0 || kpi.ganhoProxDegrau <= 0) return [];

  const dias = diasRestantes(r);
  const ritmo = dias > 0 ? kpi.gapProxDegrau / dias : kpi.gapProxDegrau;
  const alvo = r.consolidado
    ? 'o próximo degrau de cada distribuidor'
    : `${percentual(kpi.proxDegrau, 0)} da meta de volume`;

  return [
    {
      id: 'gap-volume',
      peso: 1000 + kpi.ganhoProxDegrau,
      severidade: kpi.ating < 0.9 ? 'critico' : 'atencao',
      kpi: 'volume',
      titulo: 'Volume — ritmo necessário',
      texto:
        `Faltam ${toneladas(kpi.gapProxDegrau)} para ${alvo}. ` +
        (dias > 0
          ? `São ${toneladas(ritmo)} por dia útil nos ${pluralizar(dias, 'dia restante', 'dias restantes')}. `
          : 'O mês já fechou o calendário de dias úteis. ') +
        `Vale ${moeda(kpi.ganhoProxDegrau)}.`,
      impactoReais: kpi.ganhoProxDegrau,
      acaoHref: '/recuperacao',
      acaoLabel: 'Ver clientes em queda',
    },
  ];
}

function regraRecuperacao(e: EntradaInsights): Insight[] {
  const lista = e.oportunidadesRecuperacao;
  if (lista.length === 0) return [];

  const queda = lista.reduce((s, o) => s + o.quedaTon, 0);
  const gapVolume = e.resumo?.kpis.volume.gapProxDegrau ?? 0;
  const cobre = gapVolume > 0 && queda >= gapVolume;

  return [
    {
      id: 'recuperacao-queda',
      peso: 850 + queda,
      severidade: cobre ? 'atencao' : 'informativo',
      kpi: 'volume',
      titulo: 'Clientes comprando abaixo da própria média',
      texto:
        `${inteiro(lista.length)} PDVs compraram, mas abaixo da média dos últimos 3 meses — ` +
        `${toneladas(queda)} a menos. ` +
        (cobre
          ? 'Trazer esses clientes de volta ao patamar histórico já cobre o gap de volume do mês.'
          : `Isso cobre ${percentual(gapVolume > 0 ? queda / gapVolume : 0, 0)} do gap de volume.`),
      impactoReais: lista.reduce((s, o) => s + o.valorPotencial, 0),
      acaoHref: '/recuperacao',
      acaoLabel: 'Abrir ranking de recuperação',
    },
  ];
}

function regraKpiPerdido(e: EntradaInsights): Insight[] {
  const r = e.resumo;
  if (!r) return [];

  const perdidos = (['positivacao', 'volume', 'mixHero'] as const)
    .map((id) => r.kpis[id])
    .filter((k) => k.atingProjetado > 0 && k.atingProjetado < 0.9);

  if (perdidos.length === 0) return [];

  const valorEmRisco = perdidos.reduce((s, k) => s + r.sellIn * k.peso, 0);

  return [
    {
      id: 'kpi-em-risco',
      peso: 1500 + valorEmRisco,
      severidade: 'critico',
      kpi: 'geral',
      titulo: 'Premiação em risco',
      texto:
        `No ritmo atual, ${perdidos.map((k) => k.label).join(' e ')} ` +
        `${perdidos.length === 1 ? 'fecha' : 'fecham'} abaixo de 90% e ` +
        `${perdidos.length === 1 ? 'não paga' : 'não pagam'} nada. ` +
        `São ${moeda(valorEmRisco)} que saem da mesa se nada mudar em ` +
        `${pluralizar(diasRestantes(r), 'dia útil', 'dias úteis')}.`,
      impactoReais: valorEmRisco,
      acaoHref: '/executivo',
      acaoLabel: 'Ver detalhamento',
    },
  ];
}

function regraTudoNoAlvo(e: EntradaInsights): Insight[] {
  const r = e.resumo;
  if (!r) return [];
  const todosNoTopo = (['positivacao', 'volume', 'mixHero'] as const).every(
    (id) => r.kpis[id].ating >= 1,
  );
  if (!todosNoTopo) return [];

  return [
    {
      id: 'tudo-no-alvo',
      peso: 500,
      severidade: 'positivo',
      kpi: 'geral',
      titulo: 'Premiação máxima assegurada',
      texto:
        `Os três KPIs estão em 100% ou acima. A premiação do mês está travada em ` +
        `${moeda(r.premioTotal)} — o teto de ${percentual(0.02, 0)} do sell-in. ` +
        `Daqui para frente, todo volume adicional é margem, não prêmio.`,
      impactoReais: r.premioTotal,
    },
  ];
}

function regraCapturaParcial(e: EntradaInsights): Insight[] {
  const r = e.resumo;
  if (!r || r.premioPotencial <= 0) return [];
  const captura = r.premioTotal / r.premioPotencial;
  if (captura >= 0.99) return [];

  return [
    {
      id: 'captura-parcial',
      peso: 400 + r.premioNaoCapturado,
      severidade: captura < 0.5 ? 'critico' : 'informativo',
      kpi: 'geral',
      titulo: 'Dinheiro na mesa',
      texto:
        `A premiação está em ${percentual(captura, 0)} do teto: ${moeda(r.premioTotal)} de ` +
        `${moeda(r.premioPotencial)} possíveis. ` +
        `Ainda dá para capturar ${moeda(r.ganhoProxDegrauTotal)} cruzando os próximos degraus.`,
      impactoReais: r.premioNaoCapturado,
    },
  ];
}

const REGRAS = [
  regraKpiPerdido,
  regraHeroFalta1,
  regraGapPositivacao,
  regraGapVolume,
  regraPdvsSumiram,
  regraRecuperacao,
  regraCapturaParcial,
  regraTudoNoAlvo,
];

/**
 * Gera os insights ordenados. `limite` existe porque um painel com 12 frases
 * não é um painel de ação — é uma lista de leitura que ninguém termina.
 */
export function gerarInsights(entrada: EntradaInsights, limite = 5): Insight[] {
  const todos = REGRAS.flatMap((regra) => {
    try {
      return regra(entrada);
    } catch {
      // Uma regra quebrada não pode derrubar o painel inteiro.
      return [];
    }
  });

  return todos.sort((a, b) => b.peso - a.peso).slice(0, limite);
}

/** Utilitário exposto para a UI de simulação ("e se eu positivar mais N PDVs?"). */
export function simularPositivacao(
  resumo: PptSummary,
  pdvsAdicionais: number,
): { novoAting: number; novoPremio: number; ganho: number } {
  const kpi = resumo.kpis.positivacao;
  const novoReal = kpi.real + pdvsAdicionais;
  const novoAting = kpi.meta > 0 ? novoReal / kpi.meta : 0;
  const fator = novoAting >= 1 ? 1 : novoAting >= 0.95 ? 0.7 : novoAting >= 0.9 ? 0.5 : 0;
  const novoPremio = resumo.sellIn * kpi.peso * fator;
  return {
    novoAting,
    novoPremio,
    ganho: Math.max(0, novoPremio - kpi.premio),
  };
}

/** Quantos PDVs faltam para o próximo degrau, dado um atingimento atual. */
export function pdvsParaProximoDegrau(meta: number, real: number): number {
  const ating = meta > 0 ? real / meta : 0;
  const prox = proximoDegrau(ating);
  if (prox === 0) return 0;
  return Math.max(0, Math.ceil(meta * prox) - real);
}
