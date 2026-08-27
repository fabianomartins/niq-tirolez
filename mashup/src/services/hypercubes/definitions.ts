/**
 * Definições de hypercube do PPT.
 *
 * Cada cubo declara dimensões e medidas em ORDEM. Essa ordem é o contrato:
 * o mapper (mappers.ts) lê por índice e o provider mock devolve tuplas na
 * mesma ordem. Mudar a ordem aqui sem mudar o mapper quebra as duas pontas de
 * uma vez — por isso os índices são derivados, nunca escritos à mão.
 */

import type { HyperCubeDef } from '@/types/qlik';

/** Limite do Engine: qHeight * qWidth <= 10.000 células por página. */
const MAX_CELULAS = 10_000;

interface CubeSpec {
  id: string;
  dimensions: Array<[field: string, label: string]>;
  measures: Array<[expression: string, label: string]>;
  /** Índice da coluna de ordenação (contando dims + measures). */
  sortByColumn?: number;
  sortAsc?: boolean;
  maxRows?: number;
  suppressZero?: boolean;
}

export interface CompiledCube {
  def: HyperCubeDef;
  /** Nome da coluna -> índice na matriz. */
  col: Record<string, number>;
  labels: string[];
}

function compile(spec: CubeSpec): CompiledCube {
  const width = spec.dimensions.length + spec.measures.length;
  const height = Math.min(spec.maxRows ?? 5000, Math.floor(MAX_CELULAS / Math.max(width, 1)));

  const col: Record<string, number> = {};
  spec.dimensions.forEach(([field], i) => {
    col[field] = i;
  });
  spec.measures.forEach(([, label], i) => {
    col[label] = spec.dimensions.length + i;
  });

  const interColumnSortOrder = Array.from({ length: width }, (_, i) => i);
  if (spec.sortByColumn !== undefined) {
    // Coloca a coluna de ordenação na frente da ordem de classificação.
    const rest = interColumnSortOrder.filter((i) => i !== spec.sortByColumn);
    interColumnSortOrder.splice(0, width, spec.sortByColumn, ...rest);
  }

  const def: HyperCubeDef = {
    id: spec.id,
    qDimensions: spec.dimensions.map(([field, label]) => ({
      qDef: { qFieldDefs: [field], qFieldLabels: [label] },
      qNullSuppression: true,
    })),
    qMeasures: spec.measures.map(([expression, label], i) => ({
      qDef: { qDef: expression, qLabel: label },
      ...(spec.sortByColumn === spec.dimensions.length + i
        ? { qSortBy: { qSortByNumeric: spec.sortAsc ? 1 : -1 } }
        : {}),
    })),
    qInitialDataFetch: [{ qTop: 0, qLeft: 0, qHeight: height, qWidth: width }],
    qSuppressZero: spec.suppressZero ?? false,
    qSuppressMissing: true,
    qInterColumnSortOrder: interColumnSortOrder,
    qMode: 'S',
  };

  return { def, col, labels: [...spec.dimensions.map((d) => d[1]), ...spec.measures.map((m) => m[1])] };
}

/* ===========================================================================
   TELA 1 e 6 — resumo PPT por distribuidor x competência
   =========================================================================== */
export const CUBE_SUMMARY = compile({
  id: 'ppt.summary',
  dimensions: [
    ['PPT_DistribuidorID', 'ID'],
    ['DistribuidorNome', 'Distribuidor'],
    ['RegiaoNome', 'Região'],
    ['ExecutivoNome', 'Executivo'],
    ['PPT_AnoMes', 'Competência'],
    ['PPT_StatusRisco', 'Status'],
  ],
  measures: [
    ['Sum(SellInValor)', 'SellIn'],

    ['Sum(MetaPositivacao)', 'MetaPos'],
    ['Sum(RealPositivacao)', 'RealPos'],
    ['If(Sum(MetaPositivacao)>0, Sum(RealPositivacao)/Sum(MetaPositivacao), 0)', 'AtingPos'],
    ['Sum(PremioPositivacao)', 'PremioPos'],
    ['Max(ProxDegrauPositivacao)', 'ProxDegrauPos'],
    ['Sum(GapPositivacaoUn)', 'GapPos'],
    ['Sum(GanhoProxDegrauPositivacao)', 'GanhoPos'],
    ['Sum(Gap100PositivacaoUn)', 'Gap100Pos'],
    ['Sum(ProjPositivacao)', 'ProjPos'],
    ['Max(AtingProjPositivacao)', 'AtingProjPos'],

    ['Sum(MetaVolumeTon)', 'MetaVol'],
    ['Sum(RealVolumeTon)', 'RealVol'],
    ['If(Sum(MetaVolumeTon)>0, Sum(RealVolumeTon)/Sum(MetaVolumeTon), 0)', 'AtingVol'],
    ['Sum(PremioVolume)', 'PremioVol'],
    ['Max(ProxDegrauVolume)', 'ProxDegrauVol'],
    ['Sum(GapVolumeTon)', 'GapVol'],
    ['Sum(GanhoProxDegrauVolume)', 'GanhoVol'],
    ['Sum(Gap100VolumeTon)', 'Gap100Vol'],
    ['Sum(ProjVolumeTon)', 'ProjVol'],
    ['Max(AtingProjVolume)', 'AtingProjVol'],

    ['Sum(MetaMixHero)', 'MetaHero'],
    ['Sum(RealMixHero)', 'RealHero'],
    ['If(Sum(MetaMixHero)>0, Sum(RealMixHero)/Sum(MetaMixHero), 0)', 'AtingHero'],
    ['Sum(PremioMixHero)', 'PremioHero'],
    ['Max(ProxDegrauMixHero)', 'ProxDegrauHero'],
    ['Sum(GapMixHeroUn)', 'GapHero'],
    ['Sum(GanhoProxDegrauMixHero)', 'GanhoHero'],
    ['Sum(Gap100MixHeroUn)', 'Gap100Hero'],
    ['Sum(ProjMixHero)', 'ProjHero'],
    ['Max(AtingProjMixHero)', 'AtingProjHero'],

    ['Sum(PremioTotal)', 'PremioTotal'],
    ['Sum(PremioPotencialTotal)', 'PremioPotencial'],
    ['Sum(PremioNaoCapturado)', 'PremioNaoCapturado'],
    ['Sum(PremioProjetado)', 'PremioProjetado'],
    ['Sum(GanhoProxDegrauTotal)', 'GanhoProxTotal'],
    ['Max(DiasUteisDecorridos)', 'DUDecorridos'],
    ['Max(DiasUteisTotais)', 'DUTotais'],
  ],
  maxRows: 250,
});

/* ===========================================================================
   TELA 1 — evolução mensal
   =========================================================================== */
export const CUBE_EVOLUCAO = compile({
  id: 'ppt.evolucao',
  dimensions: [
    ['PPT_AnoMes', 'Competência'],
    ['AnoMesLabel', 'Mês'],
  ],
  measures: [
    ['If(Sum(MetaPositivacao)>0, Sum(RealPositivacao)/Sum(MetaPositivacao), 0)', 'AtingPos'],
    ['If(Sum(MetaVolumeTon)>0, Sum(RealVolumeTon)/Sum(MetaVolumeTon), 0)', 'AtingVol'],
    ['If(Sum(MetaMixHero)>0, Sum(RealMixHero)/Sum(MetaMixHero), 0)', 'AtingHero'],
    ['Sum(PremioTotal)', 'PremioTotal'],
    ['Sum(PremioPotencialTotal)', 'PremioPotencial'],
  ],
  maxRows: 36,
});

/* ===========================================================================
   TELA 2 — oportunidades de positivação
   =========================================================================== */
export const CUBE_OPP_POSITIVACAO = compile({
  id: 'opp.positivacao',
  dimensions: [
    ['OppPos_CNPJ', 'CNPJ'],
    ['OppPos_PDVFantasia', 'PDV'],
    ['OppPos_PDVCanal', 'Canal'],
    ['OppPos_PDVCidade', 'Cidade'],
    ['OppPos_Faixa', 'Prioridade'],
  ],
  measures: [
    ['Max(OppPos_Score)', 'Score'],
    ['Max(OppPos_UltimaCompra)', 'UltimaCompra'],
    ['Max(OppPos_DiasSemComprar)', 'DiasSemComprar'],
    ['Max(OppPos_MesesAtivoU3M)', 'MesesAtivos'],
    ['Sum(OppPos_MediaU3MTon)', 'MediaU3MTon'],
    ['Sum(OppPos_MediaU3MValor)', 'MediaU3MValor'],
    ['Sum(OppPos_VolumePotencialPerdidoTon)', 'PerdidoTon'],
    ['Max(OppPos_EraHero)', 'EraHero'],
    ['Max(OppPos_ValorPorPdvRecuperado)', 'ValorPorPdv'],
  ],
  sortByColumn: 5,
  maxRows: 700,
});

/* ===========================================================================
   TELA 5 — potencial de recuperação
   =========================================================================== */
export const CUBE_OPP_RECUPERACAO = compile({
  id: 'opp.recuperacao',
  dimensions: [
    ['OppRec_CNPJ', 'CNPJ'],
    ['OppRec_PDVFantasia', 'PDV'],
    ['OppRec_PDVCanal', 'Canal'],
    ['OppRec_Faixa', 'Prioridade'],
  ],
  measures: [
    ['Max(OppRec_Score)', 'Score'],
    ['Sum(OppRec_MediaU3MTon)', 'MediaU3MTon'],
    ['Sum(OppRec_VolumeMesTon)', 'VolumeMesTon'],
    ['Sum(OppRec_QuedaTon)', 'QuedaTon'],
    ['Max(OppRec_QuedaPerc)', 'QuedaPerc'],
    ['Max(OppRec_CoberturaDoGap)', 'CoberturaGap'],
    ['Sum(OppRec_ValorPotencial)', 'ValorPotencial'],
  ],
  sortByColumn: 4,
  maxRows: 700,
});

/* ===========================================================================
   TELA 3 — matriz Hero (batalha naval)
   =========================================================================== */
export const CUBE_HERO_MATRIX = compile({
  id: 'hero.matrix',
  dimensions: [
    ['HeroCNPJ', 'CNPJ'],
    ['PDVFantasia', 'PDV'],
    ['PDVCanal', 'Canal'],
    ['HeroRegiaoHero', 'Composição'],
    ['HeroStatus', 'Status'],
  ],
  measures: [
    ['Max(HeroCat1)', 'Cat1'],
    ['Max(HeroCat2)', 'Cat2'],
    ['Max(HeroCat3)', 'Cat3'],
    ['Max(HeroQtdCategorias)', 'QtdCategorias'],
    ['Sum(HeroVolumeTotalTon)', 'VolumeTon'],
    ["Only(HeroCategoriasFaltantes)", 'Faltantes'],
  ],
  sortByColumn: 8,
  sortAsc: true,
  maxRows: 900,
});

/* ===========================================================================
   TELA 4 — recomendações Hero
   =========================================================================== */
export const CUBE_HERO_RECOMENDACOES = compile({
  id: 'hero.recomendacoes',
  dimensions: [
    ['OppHero_CNPJ', 'CNPJ'],
    ['OppHero_PDVFantasia', 'PDV'],
    ['OppHero_PDVCanal', 'Canal'],
    ['OppHero_CategoriaFaltante', 'Categoria faltante'],
    ['OppHero_SKURecomendado', 'SKU'],
    ['OppHero_SKURecomendadoDesc', 'SKU descrição'],
    ['OppHero_MotivoRecomendacao', 'Motivo'],
    ['OppHero_Faixa', 'Prioridade'],
  ],
  measures: [
    ['Max(OppHero_Score)', 'Score'],
    ['Max(OppHero_CatNum)', 'CatNum'],
    ['Max(OppHero_CategoriasFaltantesQtd)', 'FaltantesQtd'],
    ['Max(OppHero_ConverteSozinho)', 'ConverteSozinho'],
    ['Sum(OppHero_VolumeEstimadoTon)', 'VolumeEstimadoTon'],
    ['Max(OppHero_ValorPorConversao)', 'ValorPorConversao'],
  ],
  sortByColumn: 8,
  maxRows: 700,
});

/* ===========================================================================
   TELA 6 — mapa regional
   =========================================================================== */
export const CUBE_MAPA = compile({
  id: 'exec.mapa',
  dimensions: [
    ['DistribuidorNome', 'Distribuidor'],
    ['RegiaoNome', 'Região'],
    ['PPT_StatusRisco', 'Status'],
  ],
  measures: [
    ['Avg(PDVLatitude)', 'Latitude'],
    ['Avg(PDVLongitude)', 'Longitude'],
    ['If(Sum(MetaVolumeTon)>0, Sum(RealVolumeTon)/Sum(MetaVolumeTon), 0)', 'AtingVol'],
    ['Sum(PremioTotal)', 'PremioTotal'],
    ['Sum(PremioPotencialTotal)', 'PremioPotencial'],
    ['Sum(GanhoProxDegrauTotal)', 'GanhoProxTotal'],
  ],
  maxRows: 200,
});

export const TODOS_OS_CUBOS = [
  CUBE_SUMMARY,
  CUBE_EVOLUCAO,
  CUBE_OPP_POSITIVACAO,
  CUBE_OPP_RECUPERACAO,
  CUBE_HERO_MATRIX,
  CUBE_HERO_RECOMENDACOES,
  CUBE_MAPA,
];
