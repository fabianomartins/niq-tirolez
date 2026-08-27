'use client';

/**
 * Provider mock — implementa o mesmo contrato do EngineProvider.
 *
 * Não é um "stub que devolve array vazio": aplica seleção, recalcula todos os
 * cubos e respeita as regras do programa. Isso permite desenvolver as telas, o
 * motor de insights e a Matrix Hero sem tenant, e permite ao QA reproduzir um
 * cenário exato sem depender de recarga.
 *
 * O acoplamento é por ID de cubo: cada id conhecido tem um gerador. Cubo novo
 * sem gerador devolve vazio e loga um aviso — falha visível, não silenciosa.
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
} from '@/services/hypercubes/definitions';
import { CATEGORIAS_HERO } from '@/lib/hero';
import {
  calcularCompetencia,
  gerarDataset,
  hashDeterministico as h,
  skuRecomendado,
  type CompetenciaCalculada,
  type MockDataset,
  type MockPdvMes,
} from './dataset';
import { labelMes } from '@/lib/format';
import type { FieldSelection, HyperCubeDef, QlikCell, QlikDataProvider } from '@/types/qlik';

type Registro = Record<string, string | number>;

function celula(valor: string | number): QlikCell {
  if (typeof valor === 'number') {
    return {
      qText: String(valor),
      qNum: valor,
      qElemNumber: -1,
      qState: 'O',
    };
  }
  return { qText: valor, qNum: 'NaN', qElemNumber: -1, qState: 'O' };
}

/** Monta a linha na ordem exata declarada pelo cubo. */
function linha(cube: CompiledCube, registro: Registro): QlikCell[] {
  const largura = Object.keys(cube.col).length;
  const cells: QlikCell[] = new Array(largura).fill(null).map(() => celula(''));
  for (const [chave, idx] of Object.entries(cube.col)) {
    cells[idx] = celula(registro[chave] ?? (typeof registro[chave] === 'number' ? 0 : ''));
  }
  return cells;
}

const CAMPOS_FILTRO = ['AnoMes', 'RegiaoNome', 'ExecutivoNome', 'DistribuidorNome', 'PDVCanal'] as const;

export class MockProvider implements QlikDataProvider {
  readonly mode = 'mock' as const;

  private readonly ds: MockDataset;

  private readonly competencias: CompetenciaCalculada[];

  private readonly selecoes = new Map<string, string[]>();

  private readonly listeners = new Set<() => void>();

  constructor(hoje = new Date()) {
    this.ds = gerarDataset(hoje);
    this.competencias = this.ds.competencias.map(calcularCompetencia);
    // Ponto de partida do cockpit: mês corrente, como o bookmark PPT_BM_MES_CORRENTE.
    this.selecoes.set('AnoMes', [this.ds.mesAtual]);
  }

  /* ---------------------------------------------------------------- estado */

  private sel(campo: (typeof CAMPOS_FILTRO)[number]): string[] | null {
    const v = this.selecoes.get(campo);
    return v && v.length > 0 ? v : null;
  }

  private get mesSelecionado(): string {
    return this.sel('AnoMes')?.[0] ?? this.ds.mesAtual;
  }

  private distribuidoresVisiveis() {
    const regiao = this.sel('RegiaoNome');
    const exec = this.sel('ExecutivoNome');
    const dist = this.sel('DistribuidorNome');
    return this.ds.distribuidores.filter(
      (d) =>
        (!regiao || regiao.includes(d.regiaoNome)) &&
        (!exec || exec.includes(d.executivoNome)) &&
        (!dist || dist.includes(d.nome)),
    );
  }

  private pdvsVisiveis() {
    const canal = this.sel('PDVCanal');
    const idsDist = new Set(this.distribuidoresVisiveis().map((d) => d.id));
    return this.ds.pdvs.filter(
      (p) => idsDist.has(p.distribuidorId) && (!canal || canal.includes(p.canal)),
    );
  }

  private competenciasVisiveis(mes?: string | null): CompetenciaCalculada[] {
    const idsDist = new Set(this.distribuidoresVisiveis().map((d) => d.id));
    return this.competencias.filter(
      (c) => idsDist.has(c.distribuidorId) && (mes === null || c.anoMes === (mes ?? this.mesSelecionado)),
    );
  }

  private distribuidorPorId(id: string) {
    return this.ds.distribuidores.find((d) => d.id === id);
  }

  /* -------------------------------------------------------------- geradores */

  private gerarSummary(): QlikCell[][] {
    return this.competenciasVisiveis().map((c) => {
      const d = this.distribuidorPorId(c.distribuidorId);
      const registro: Registro = {
        PPT_DistribuidorID: c.distribuidorId,
        DistribuidorNome: d?.nome ?? c.distribuidorId,
        RegiaoNome: d?.regiaoNome ?? '',
        ExecutivoNome: d?.executivoNome ?? '',
        PPT_AnoMes: c.anoMes,
        PPT_StatusRisco: c.statusRisco,
        SellIn: c.sellIn,
        MetaPos: c.metaPos,
        RealPos: c.realPos,
        AtingPos: c.atingPos,
        PremioPos: c.premioPos,
        ProxDegrauPos: c.proxDegrauPos,
        GapPos: c.gapPos,
        GanhoPos: c.ganhoPos,
        Gap100Pos: c.gap100Pos,
        ProjPos: c.projPos,
        AtingProjPos: c.atingProjPos,
        MetaVol: c.metaVol,
        RealVol: c.realVol,
        AtingVol: c.atingVol,
        PremioVol: c.premioVol,
        ProxDegrauVol: c.proxDegrauVol,
        GapVol: c.gapVol,
        GanhoVol: c.ganhoVol,
        Gap100Vol: c.gap100Vol,
        ProjVol: c.projVol,
        AtingProjVol: c.atingProjVol,
        MetaHero: c.metaHero,
        RealHero: c.realHero,
        AtingHero: c.atingHero,
        PremioHero: c.premioHero,
        ProxDegrauHero: c.proxDegrauHero,
        GapHero: c.gapHero,
        GanhoHero: c.ganhoHero,
        Gap100Hero: c.gap100Hero,
        ProjHero: c.projHero,
        AtingProjHero: c.atingProjHero,
        PremioTotal: c.premioTotal,
        PremioPotencial: c.premioPotencial,
        PremioNaoCapturado: c.premioNaoCapturado,
        PremioProjetado: c.premioProjetado,
        GanhoProxTotal: c.ganhoTotal,
        DUDecorridos: c.diasUteisDecorridos,
        DUTotais: c.diasUteisTotais,
      };
      return linha(CUBE_SUMMARY, registro);
    });
  }

  private gerarEvolucao(): QlikCell[][] {
    const porMes = new Map<string, CompetenciaCalculada[]>();
    for (const c of this.competenciasVisiveis(null)) {
      const arr = porMes.get(c.anoMes);
      if (arr) arr.push(c);
      else porMes.set(c.anoMes, [c]);
    }
    return [...porMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([anoMes, lista]) => {
        const soma = (f: (c: CompetenciaCalculada) => number) => lista.reduce((s, c) => s + f(c), 0);
        const metaPos = soma((c) => c.metaPos);
        const metaVol = soma((c) => c.metaVol);
        const metaHero = soma((c) => c.metaHero);
        return linha(CUBE_EVOLUCAO, {
          PPT_AnoMes: anoMes,
          AnoMesLabel: labelMes(anoMes),
          AtingPos: metaPos > 0 ? soma((c) => c.realPos) / metaPos : 0,
          AtingVol: metaVol > 0 ? soma((c) => c.realVol) / metaVol : 0,
          AtingHero: metaHero > 0 ? soma((c) => c.realHero) / metaHero : 0,
          PremioTotal: soma((c) => c.premioTotal),
          PremioPotencial: soma((c) => c.premioPotencial),
        });
      });
  }

  /** Índice PDV x mês, para as janelas de 3 meses das oportunidades. */
  private mapaPdvMes(): Map<string, MockPdvMes> {
    const m = new Map<string, MockPdvMes>();
    for (const pm of this.ds.pdvMeses) m.set(`${pm.cnpj}|${pm.anoMes}`, pm);
    return m;
  }

  private mesesAnteriores(mes: string, n: number): string[] {
    const idx = this.ds.meses.indexOf(mes);
    if (idx < 0) return [];
    return this.ds.meses.slice(Math.max(0, idx - n), idx);
  }

  private gerarOppPositivacao(): QlikCell[][] {
    const mes = this.mesSelecionado;
    const janela = this.mesesAnteriores(mes, 3);
    const idx = this.mapaPdvMes();
    const compPorDist = new Map(this.competenciasVisiveis().map((c) => [c.distribuidorId, c]));

    const linhas = this.pdvsVisiveis()
      .map((pdv) => {
        const atual = idx.get(`${pdv.cnpj}|${mes}`);
        if (atual?.comprou) return null;

        const historico = janela
          .map((m) => idx.get(`${pdv.cnpj}|${m}`))
          .filter((x): x is MockPdvMes => !!x && x.comprou);
        if (historico.length === 0) return null;

        const mediaTon = historico.reduce((s, x) => s + x.volumeTon, 0) / 3;
        const mediaValor = historico.reduce((s, x) => s + x.valor, 0) / 3;
        const ultima = historico[historico.length - 1]!;
        const eraHero = historico.some((x) => x.cats[0] && x.cats[1] && x.cats[2]);
        const dias = Math.max(
          0,
          Math.round(
            (this.ds.hoje.getTime() - new Date(`${ultima.ultimaCompra}T00:00:00Z`).getTime()) / 86_400_000,
          ),
        );
        const comp = compPorDist.get(pdv.distribuidorId);
        return { pdv, mediaTon, mediaValor, ultima, eraHero, dias, historico, comp };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const maxMedia = Math.max(0.0001, ...linhas.map((l) => l.mediaTon));

    return linhas
      .map((l) => {
        const score =
          40 * Math.min(1, l.mediaTon / maxMedia) +
          25 * Math.max(0, 1 - Math.min(1, l.dias / 90)) +
          20 * (l.historico.length / 3) +
          15 * (l.eraHero ? 1 : 0);
        const gap = l.comp?.gapPos ?? 0;
        const valorDegrau = l.comp?.ganhoPos ?? 0;
        return linha(CUBE_OPP_POSITIVACAO, {
          OppPos_CNPJ: l.pdv.cnpj,
          OppPos_PDVFantasia: l.pdv.fantasia,
          OppPos_PDVCanal: l.pdv.canal,
          OppPos_PDVCidade: l.pdv.cidade,
          OppPos_Faixa: score >= 75 ? 'Critico' : score >= 55 ? 'Alto' : score >= 35 ? 'Medio' : 'Baixo',
          Score: Number(score.toFixed(1)),
          UltimaCompra: l.ultima.ultimaCompra,
          DiasSemComprar: l.dias,
          MesesAtivos: l.historico.length,
          MediaU3MTon: Number(l.mediaTon.toFixed(4)),
          MediaU3MValor: Number(l.mediaValor.toFixed(2)),
          PerdidoTon: Number(l.mediaTon.toFixed(4)),
          EraHero: l.eraHero ? 1 : 0,
          ValorPorPdv: gap > 0 ? Number((valorDegrau / gap).toFixed(2)) : 0,
        });
      })
      .sort((a, b) => Number(b[CUBE_OPP_POSITIVACAO.col.Score!]?.qNum ?? 0) - Number(a[CUBE_OPP_POSITIVACAO.col.Score!]?.qNum ?? 0));
  }

  private gerarOppRecuperacao(): QlikCell[][] {
    const mes = this.mesSelecionado;
    const janela = this.mesesAnteriores(mes, 3);
    const idx = this.mapaPdvMes();
    const compPorDist = new Map(this.competenciasVisiveis().map((c) => [c.distribuidorId, c]));

    const linhas = this.pdvsVisiveis()
      .map((pdv) => {
        const atual = idx.get(`${pdv.cnpj}|${mes}`);
        if (!atual?.comprou) return null;
        const historico = janela
          .map((m) => idx.get(`${pdv.cnpj}|${m}`))
          .filter((x): x is MockPdvMes => !!x && x.comprou);
        if (historico.length === 0) return null;
        const mediaTon = historico.reduce((s, x) => s + x.volumeTon, 0) / 3;
        if (mediaTon <= 0 || atual.volumeTon >= mediaTon * 0.8) return null;
        return { pdv, mediaTon, atual, queda: mediaTon - atual.volumeTon, comp: compPorDist.get(pdv.distribuidorId) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const maxQueda = Math.max(0.0001, ...linhas.map((l) => l.queda));

    return linhas
      .map((l) => {
        const quedaPerc = l.queda / l.mediaTon;
        const score = 60 * Math.min(1, l.queda / maxQueda) + 40 * Math.min(1, quedaPerc);
        const gapVol = l.comp?.gapVol ?? 0;
        const cobertura = gapVol > 0 ? Math.min(1, l.queda / gapVol) : 0;
        return linha(CUBE_OPP_RECUPERACAO, {
          OppRec_CNPJ: l.pdv.cnpj,
          OppRec_PDVFantasia: l.pdv.fantasia,
          OppRec_PDVCanal: l.pdv.canal,
          OppRec_Faixa: score >= 75 ? 'Critico' : score >= 55 ? 'Alto' : score >= 35 ? 'Medio' : 'Baixo',
          Score: Number(score.toFixed(1)),
          MediaU3MTon: Number(l.mediaTon.toFixed(4)),
          VolumeMesTon: Number(l.atual.volumeTon.toFixed(4)),
          QuedaTon: Number(l.queda.toFixed(4)),
          QuedaPerc: Number(quedaPerc.toFixed(4)),
          CoberturaGap: Number(cobertura.toFixed(4)),
          ValorPotencial: Number((cobertura * (l.comp?.ganhoVol ?? 0)).toFixed(2)),
        });
      })
      .sort((a, b) => Number(b[CUBE_OPP_RECUPERACAO.col.Score!]?.qNum ?? 0) - Number(a[CUBE_OPP_RECUPERACAO.col.Score!]?.qNum ?? 0));
  }

  private gerarHeroMatrix(): QlikCell[][] {
    const mes = this.mesSelecionado;
    const idx = this.mapaPdvMes();
    return this.pdvsVisiveis()
      .map((pdv) => {
        const pm = idx.get(`${pdv.cnpj}|${mes}`);
        const dist = this.distribuidorPorId(pdv.distribuidorId);
        const composicao = dist?.heroComposicao ?? 'DEMAIS';
        const cats = pm?.comprou ? pm.cats : ([false, false, false] as [boolean, boolean, boolean]);
        const qtd = cats.filter(Boolean).length;
        const rotulos = CATEGORIAS_HERO[composicao];
        const faltantes = rotulos.filter((_, i) => !cats[i]).join('; ');
        return linha(CUBE_HERO_MATRIX, {
          HeroCNPJ: pdv.cnpj,
          PDVFantasia: pdv.fantasia,
          PDVCanal: pdv.canal,
          HeroRegiaoHero: composicao,
          HeroStatus:
            qtd === 3 ? 'Completo' : qtd === 2 ? 'Falta 1' : qtd >= 1 ? 'Falta 2+' : 'Sem compra Hero',
          Cat1: cats[0] ? 1 : 0,
          Cat2: cats[1] ? 1 : 0,
          Cat3: cats[2] ? 1 : 0,
          QtdCategorias: qtd,
          VolumeTon: Number((pm?.volumeTon ?? 0).toFixed(4)),
          Faltantes: faltantes,
        });
      })
      .sort(
        (a, b) =>
          Number(b[CUBE_HERO_MATRIX.col.QtdCategorias!]?.qNum ?? 0) -
          Number(a[CUBE_HERO_MATRIX.col.QtdCategorias!]?.qNum ?? 0),
      );
  }

  private gerarRecomendacoesHero(): QlikCell[][] {
    const mes = this.mesSelecionado;
    const idx = this.mapaPdvMes();
    const compPorDist = new Map(this.competenciasVisiveis().map((c) => [c.distribuidorId, c]));
    const saida: QlikCell[][] = [];

    for (const pdv of this.pdvsVisiveis()) {
      const pm = idx.get(`${pdv.cnpj}|${mes}`);
      if (!pm?.comprou) continue;
      const qtd = pm.cats.filter(Boolean).length;
      if (qtd < 1 || qtd > 2) continue;

      const dist = this.distribuidorPorId(pdv.distribuidorId);
      const composicao = dist?.heroComposicao ?? 'DEMAIS';
      const rotulos = CATEGORIAS_HERO[composicao];
      const comp = compPorDist.get(pdv.distribuidorId);
      const seed = Number(pdv.cnpj.slice(-4));

      pm.cats.forEach((tem, i) => {
        if (tem) return;
        const catNum = i + 1;
        const sku = skuRecomendado(composicao, catNum, seed + catNum);
        const converteSozinho = qtd === 2;
        const jaComprou = this.mesesAnteriores(mes, 3).some(
          (m) => idx.get(`${pdv.cnpj}|${m}`)?.cats[i] === true,
        );
        const score =
          45 * (converteSozinho ? 1 : 0.4) +
          35 * Math.min(1, pm.volumeTon / 0.5) +
          20 * (jaComprou ? 1 : 0);
        const gapHero = comp?.gapHero ?? 0;

        saida.push(
          linha(CUBE_HERO_RECOMENDACOES, {
            OppHero_CNPJ: pdv.cnpj,
            OppHero_PDVFantasia: pdv.fantasia,
            OppHero_PDVCanal: pdv.canal,
            OppHero_CategoriaFaltante: rotulos[i] ?? `Cat ${catNum}`,
            OppHero_SKURecomendado: sku.codigo,
            OppHero_SKURecomendadoDesc: sku.descricao,
            OppHero_MotivoRecomendacao: jaComprou
              ? 'Já comprou este SKU antes'
              : `Mais vendido no canal ${pdv.canal}`,
            OppHero_Faixa: score >= 75 ? 'Critico' : score >= 55 ? 'Alto' : score >= 35 ? 'Medio' : 'Baixo',
            Score: Number(score.toFixed(1)),
            CatNum: catNum,
            FaltantesQtd: 3 - qtd,
            ConverteSozinho: converteSozinho ? 1 : 0,
            VolumeEstimadoTon: Number((0.02 + h(seed, catNum, 4.2) * 0.08).toFixed(4)),
            ValorPorConversao:
              converteSozinho && gapHero > 0 ? Number(((comp?.ganhoHero ?? 0) / gapHero).toFixed(2)) : 0,
          }),
        );
      });
    }

    return saida.sort(
      (a, b) =>
        Number(b[CUBE_HERO_RECOMENDACOES.col.Score!]?.qNum ?? 0) -
        Number(a[CUBE_HERO_RECOMENDACOES.col.Score!]?.qNum ?? 0),
    );
  }

  private gerarMapa(): QlikCell[][] {
    return this.competenciasVisiveis().map((c) => {
      const d = this.distribuidorPorId(c.distribuidorId);
      return linha(CUBE_MAPA, {
        DistribuidorNome: d?.nome ?? c.distribuidorId,
        RegiaoNome: d?.regiaoNome ?? '',
        PPT_StatusRisco: c.statusRisco,
        Latitude: d?.lat ?? 0,
        Longitude: d?.lon ?? 0,
        AtingVol: c.atingVol,
        PremioTotal: c.premioTotal,
        PremioPotencial: c.premioPotencial,
        GanhoProxTotal: c.ganhoTotal,
      });
    });
  }

  /* ------------------------------------------------------- QlikDataProvider */

  async getHyperCubeData(def: HyperCubeDef): Promise<QlikCell[][]> {
    switch (def.id) {
      case CUBE_SUMMARY.def.id:
        return this.gerarSummary();
      case CUBE_EVOLUCAO.def.id:
        return this.gerarEvolucao();
      case CUBE_OPP_POSITIVACAO.def.id:
        return this.gerarOppPositivacao();
      case CUBE_OPP_RECUPERACAO.def.id:
        return this.gerarOppRecuperacao();
      case CUBE_HERO_MATRIX.def.id:
        return this.gerarHeroMatrix();
      case CUBE_HERO_RECOMENDACOES.def.id:
        return this.gerarRecomendacoesHero();
      case CUBE_MAPA.def.id:
        return this.gerarMapa();
      default:
        console.warn(`[MockProvider] cubo sem gerador: ${def.id}`);
        return [];
    }
  }

  async select({ field, values }: FieldSelection): Promise<void> {
    if (values.length === 0) this.selecoes.delete(field);
    else this.selecoes.set(field, values.map(String));
    this.emit();
  }

  async clear(field?: string): Promise<void> {
    if (field) this.selecoes.delete(field);
    else {
      this.selecoes.clear();
      this.selecoes.set('AnoMes', [this.ds.mesAtual]);
    }
    this.emit();
  }

  async getFieldValues(field: string): Promise<string[]> {
    switch (field) {
      case 'AnoMes':
        return [...this.ds.meses].reverse();
      case 'RegiaoNome':
        return [...new Set(this.ds.distribuidores.map((d) => d.regiaoNome))].sort();
      case 'ExecutivoNome':
        return [...new Set(this.ds.distribuidores.map((d) => d.executivoNome))].sort();
      case 'DistribuidorNome':
        return this.distribuidoresVisiveis().map((d) => d.nome);
      case 'PDVCanal':
        return [...new Set(this.ds.pdvs.map((p) => p.canal))].sort();
      default:
        return [];
    }
  }

  onInvalidate(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit() {
    this.listeners.forEach((cb) => cb());
  }
}
