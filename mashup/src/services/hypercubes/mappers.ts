/**
 * Conversão matriz do Engine -> objetos tipados do domínio.
 *
 * Toda leitura passa por num()/txt(), que tratam NaN e null do Engine. Célula
 * nula somada como zero é o bug silencioso mais caro que existe em Qlik.
 */

import {
  CUBE_EVOLUCAO,
  CUBE_HERO_MATRIX,
  CUBE_HERO_RECOMENDACOES,
  CUBE_MAPA,
  CUBE_OPP_POSITIVACAO,
  CUBE_OPP_RECUPERACAO,
  CUBE_SUMMARY,
  type CompiledCube,
} from './definitions';
import { PESOS, fatorPremio } from '@/lib/status';
import { labelMes } from '@/lib/format';
import type {
  DistribuidorRow,
  EvolucaoPonto,
  HeroCelula,
  HeroMatrixRow,
  KpiId,
  KpiState,
  OportunidadePositivacao,
  OportunidadeRecuperacao,
  PptSummary,
  PrioridadeOportunidade,
  RecomendacaoHero,
  StatusRisco,
} from '@/types/ppt';
import type { QlikCell } from '@/types/qlik';

function reader(cube: CompiledCube, row: QlikCell[]) {
  return {
    num(key: string): number {
      const idx = cube.col[key];
      if (idx === undefined) return 0;
      const cell = row[idx];
      if (!cell || cell.qIsNull) return 0;
      return typeof cell.qNum === 'number' && Number.isFinite(cell.qNum) ? cell.qNum : 0;
    },
    txt(key: string): string {
      const idx = cube.col[key];
      if (idx === undefined) return '';
      const cell = row[idx];
      if (!cell || cell.qIsNull) return '';
      return cell.qText ?? '';
    },
    bool(key: string): boolean {
      const idx = cube.col[key];
      if (idx === undefined) return false;
      const cell = row[idx];
      return !!cell && !cell.qIsNull && cell.qNum === 1;
    },
  };
}

function prioridade(v: string): PrioridadeOportunidade {
  if (v === 'Critico' || v === 'Alto' || v === 'Medio' || v === 'Baixo') return v;
  return 'Baixo';
}

function statusRisco(v: string): StatusRisco {
  if (v === 'Risco alto' || v === 'Atencao' || v === 'No alvo') return v;
  return 'Atencao';
}

/* ------------------------------------------------------------------------ */
/* Resumo PPT                                                                */
/* ------------------------------------------------------------------------ */

function montaKpi(
  id: KpiId,
  label: string,
  unidade: KpiState['unidade'],
  r: ReturnType<typeof reader>,
  sufixo: 'Pos' | 'Vol' | 'Hero',
): KpiState {
  const ating = r.num(`Ating${sufixo}`);
  return {
    id,
    label,
    unidade,
    meta: r.num(`Meta${sufixo}`),
    real: r.num(`Real${sufixo}`),
    ating,
    fator: fatorPremio(ating),
    peso: PESOS[id],
    premio: r.num(`Premio${sufixo}`),
    proxDegrau: r.num(`ProxDegrau${sufixo}`),
    gapProxDegrau: r.num(`Gap${sufixo}`),
    ganhoProxDegrau: r.num(`Ganho${sufixo}`),
    gap100: r.num(`Gap100${sufixo}`),
    projetado: r.num(`Proj${sufixo}`),
    atingProjetado: r.num(`AtingProj${sufixo}`),
  };
}

export function mapSummary(matrix: QlikCell[][]): PptSummary[] {
  return matrix.map((row) => {
    const r = reader(CUBE_SUMMARY, row);
    return {
      distribuidorId: r.txt('PPT_DistribuidorID'),
      distribuidorNome: r.txt('DistribuidorNome'),
      regiaoNome: r.txt('RegiaoNome'),
      executivoNome: r.txt('ExecutivoNome'),
      anoMes: r.txt('PPT_AnoMes'),
      sellIn: r.num('SellIn'),
      kpis: {
        positivacao: montaKpi('positivacao', 'Positivação', 'PDVs', r, 'Pos'),
        volume: montaKpi('volume', 'Volume Sell Out', 'ton', r, 'Vol'),
        mixHero: montaKpi('mixHero', 'Mix Hero', 'PDVs', r, 'Hero'),
      },
      premioTotal: r.num('PremioTotal'),
      premioPotencial: r.num('PremioPotencial'),
      premioNaoCapturado: r.num('PremioNaoCapturado'),
      premioProjetado: r.num('PremioProjetado'),
      ganhoProxDegrauTotal: r.num('GanhoProxTotal'),
      statusRisco: statusRisco(r.txt('PPT_StatusRisco')),
      diasUteisDecorridos: r.num('DUDecorridos'),
      diasUteisTotais: r.num('DUTotais'),
      consolidado: false,
      qtdDistribuidores: 1,
    };
  });
}

/**
 * Consolida várias linhas (um distribuidor por linha) em um único resumo.
 * É o que alimenta os KPI cards quando o usuário olha a carteira inteira.
 */
export function consolidarSummary(linhas: PptSummary[]): PptSummary | null {
  if (linhas.length === 0) return null;
  const primeira = linhas[0]!;
  if (linhas.length === 1) return primeira;

  const somaKpi = (id: KpiId): KpiState => {
    const base = primeira.kpis[id];
    const meta = linhas.reduce((s, l) => s + l.kpis[id].meta, 0);
    const real = linhas.reduce((s, l) => s + l.kpis[id].real, 0);
    const ating = meta > 0 ? real / meta : 0;
    return {
      ...base,
      meta,
      real,
      ating,
      fator: fatorPremio(ating),
      premio: linhas.reduce((s, l) => s + l.kpis[id].premio, 0),
      // O gap consolidado é a SOMA dos gaps individuais: cada distribuidor tem
      // o próprio degrau. Média de percentual aqui esconderia quem está mal.
      // Por isso `proxDegrau` fica 0 e a UI lê `consolidado` para não anunciar
      // um percentual único que não existe na carteira.
      gapProxDegrau: linhas.reduce((s, l) => s + l.kpis[id].gapProxDegrau, 0),
      ganhoProxDegrau: linhas.reduce((s, l) => s + l.kpis[id].ganhoProxDegrau, 0),
      gap100: linhas.reduce((s, l) => s + l.kpis[id].gap100, 0),
      projetado: linhas.reduce((s, l) => s + l.kpis[id].projetado, 0),
      atingProjetado: meta > 0 ? linhas.reduce((s, l) => s + l.kpis[id].projetado, 0) / meta : 0,
      proxDegrau: 0,
    };
  };

  const piorStatus: StatusRisco = linhas.some((l) => l.statusRisco === 'Risco alto')
    ? 'Risco alto'
    : linhas.some((l) => l.statusRisco === 'Atencao')
      ? 'Atencao'
      : 'No alvo';

  return {
    distribuidorId: '*',
    distribuidorNome: `${linhas.length} distribuidores`,
    regiaoNome: new Set(linhas.map((l) => l.regiaoNome)).size === 1 ? primeira.regiaoNome : 'Todas',
    executivoNome: new Set(linhas.map((l) => l.executivoNome)).size === 1 ? primeira.executivoNome : 'Todos',
    anoMes: primeira.anoMes,
    sellIn: linhas.reduce((s, l) => s + l.sellIn, 0),
    kpis: {
      positivacao: somaKpi('positivacao'),
      volume: somaKpi('volume'),
      mixHero: somaKpi('mixHero'),
    },
    premioTotal: linhas.reduce((s, l) => s + l.premioTotal, 0),
    premioPotencial: linhas.reduce((s, l) => s + l.premioPotencial, 0),
    premioNaoCapturado: linhas.reduce((s, l) => s + l.premioNaoCapturado, 0),
    premioProjetado: linhas.reduce((s, l) => s + l.premioProjetado, 0),
    ganhoProxDegrauTotal: linhas.reduce((s, l) => s + l.ganhoProxDegrauTotal, 0),
    statusRisco: piorStatus,
    diasUteisDecorridos: primeira.diasUteisDecorridos,
    diasUteisTotais: primeira.diasUteisTotais,
    consolidado: true,
    qtdDistribuidores: linhas.length,
  };
}

export function mapDistribuidores(matrix: QlikCell[][]): DistribuidorRow[] {
  return mapSummary(matrix).map((s) => ({
    distribuidorId: s.distribuidorId,
    distribuidor: s.distribuidorNome,
    regiao: s.regiaoNome,
    executivo: s.executivoNome,
    atingPositivacao: s.kpis.positivacao.ating,
    atingVolume: s.kpis.volume.ating,
    atingMixHero: s.kpis.mixHero.ating,
    premioTotal: s.premioTotal,
    premioPotencial: s.premioPotencial,
    ganhoProxDegrau: s.ganhoProxDegrauTotal,
    statusRisco: s.statusRisco,
  }));
}

/* ------------------------------------------------------------------------ */
/* Evolução                                                                  */
/* ------------------------------------------------------------------------ */

export function mapEvolucao(matrix: QlikCell[][]): EvolucaoPonto[] {
  return matrix
    .map((row) => {
      const r = reader(CUBE_EVOLUCAO, row);
      const anoMes = r.txt('PPT_AnoMes');
      return {
        anoMes,
        label: r.txt('AnoMesLabel') || labelMes(anoMes),
        atingPositivacao: r.num('AtingPos'),
        atingVolume: r.num('AtingVol'),
        atingMixHero: r.num('AtingHero'),
        premioTotal: r.num('PremioTotal'),
        premioPotencial: r.num('PremioPotencial'),
      };
    })
    .sort((a, b) => a.anoMes.localeCompare(b.anoMes));
}

/* ------------------------------------------------------------------------ */
/* Oportunidades                                                             */
/* ------------------------------------------------------------------------ */

export function mapOportunidadePositivacao(matrix: QlikCell[][]): OportunidadePositivacao[] {
  return matrix.map((row) => {
    const r = reader(CUBE_OPP_POSITIVACAO, row);
    const cnpjValor = r.txt('OppPos_CNPJ');
    return {
      chave: cnpjValor,
      cnpj: cnpjValor,
      pdv: r.txt('OppPos_PDVFantasia'),
      canal: r.txt('OppPos_PDVCanal'),
      cidade: r.txt('OppPos_PDVCidade'),
      ultimaCompra: r.txt('UltimaCompra'),
      diasSemComprar: r.num('DiasSemComprar'),
      mesesAtivosU3M: r.num('MesesAtivos'),
      mediaU3MTon: r.num('MediaU3MTon'),
      mediaU3MValor: r.num('MediaU3MValor'),
      volumePotencialPerdidoTon: r.num('PerdidoTon'),
      eraHero: r.bool('EraHero'),
      valorPorPdvRecuperado: r.num('ValorPorPdv'),
      score: r.num('Score'),
      prioridade: prioridade(r.txt('OppPos_Faixa')),
    };
  });
}

export function mapOportunidadeRecuperacao(matrix: QlikCell[][]): OportunidadeRecuperacao[] {
  return matrix.map((row) => {
    const r = reader(CUBE_OPP_RECUPERACAO, row);
    const cnpjValor = r.txt('OppRec_CNPJ');
    return {
      chave: cnpjValor,
      cnpj: cnpjValor,
      pdv: r.txt('OppRec_PDVFantasia'),
      canal: r.txt('OppRec_PDVCanal'),
      mediaU3MTon: r.num('MediaU3MTon'),
      volumeMesTon: r.num('VolumeMesTon'),
      quedaTon: r.num('QuedaTon'),
      quedaPerc: r.num('QuedaPerc'),
      coberturaDoGap: r.num('CoberturaGap'),
      valorPotencial: r.num('ValorPotencial'),
      score: r.num('Score'),
      prioridade: prioridade(r.txt('OppRec_Faixa')),
    };
  });
}

/* ------------------------------------------------------------------------ */
/* Hero                                                                      */
/* ------------------------------------------------------------------------ */

export function mapHeroMatrix(matrix: QlikCell[][]): HeroMatrixRow[] {
  return matrix.map((row) => {
    const r = reader(CUBE_HERO_MATRIX, row);
    const celula = (v: number): HeroCelula => (v === 1 ? 'comprou' : 'falta');
    const statusTxt = r.txt('HeroStatus');
    return {
      chave: r.txt('HeroCNPJ'),
      cnpj: r.txt('HeroCNPJ'),
      pdv: r.txt('PDVFantasia'),
      canal: r.txt('PDVCanal'),
      regiaoHero: r.txt('HeroRegiaoHero') === 'SP' ? 'SP' : 'DEMAIS',
      categorias: [celula(r.num('Cat1')), celula(r.num('Cat2')), celula(r.num('Cat3'))],
      qtdCategorias: r.num('QtdCategorias'),
      status:
        statusTxt === 'Completo' || statusTxt === 'Falta 1' || statusTxt === 'Falta 2+'
          ? statusTxt
          : 'Sem compra Hero',
      volumeTon: r.num('VolumeTon'),
      categoriasFaltantes: r.txt('Faltantes'),
    };
  });
}

export function mapRecomendacoesHero(matrix: QlikCell[][]): RecomendacaoHero[] {
  return matrix.map((row) => {
    const r = reader(CUBE_HERO_RECOMENDACOES, row);
    return {
      chave: `${r.txt('OppHero_CNPJ')}#${r.num('CatNum')}`,
      cnpj: r.txt('OppHero_CNPJ'),
      pdv: r.txt('OppHero_PDVFantasia'),
      canal: r.txt('OppHero_PDVCanal'),
      categoriaFaltante: r.txt('OppHero_CategoriaFaltante'),
      categoriaNum: r.num('CatNum'),
      categoriasFaltantesQtd: r.num('FaltantesQtd'),
      converteSozinho: r.num('ConverteSozinho') === 1,
      skuRecomendado: r.txt('OppHero_SKURecomendado'),
      skuDescricao: r.txt('OppHero_SKURecomendadoDesc'),
      motivo: r.txt('OppHero_MotivoRecomendacao'),
      volumeEstimadoTon: r.num('VolumeEstimadoTon'),
      valorPorConversao: r.num('ValorPorConversao'),
      score: r.num('Score'),
      prioridade: prioridade(r.txt('OppHero_Faixa')),
    };
  });
}

export function mapMapa(matrix: QlikCell[][]): DistribuidorRow[] {
  return matrix.map((row) => {
    const r = reader(CUBE_MAPA, row);
    return {
      distribuidorId: r.txt('DistribuidorNome'),
      distribuidor: r.txt('DistribuidorNome'),
      regiao: r.txt('RegiaoNome'),
      executivo: '',
      atingPositivacao: 0,
      atingVolume: r.num('AtingVol'),
      atingMixHero: 0,
      premioTotal: r.num('PremioTotal'),
      premioPotencial: r.num('PremioPotencial'),
      ganhoProxDegrau: r.num('GanhoProxTotal'),
      statusRisco: statusRisco(r.txt('PPT_StatusRisco')),
      latitude: r.num('Latitude'),
      longitude: r.num('Longitude'),
    };
  });
}
