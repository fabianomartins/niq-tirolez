import { describe, expect, it } from 'vitest';
import { gerarInsights, pdvsParaProximoDegrau, simularPositivacao } from './engine';
import { fatorPremio, proximoDegrau, PESOS, PESO_TOTAL } from '@/lib/status';
import type { KpiId, KpiState, PptSummary } from '@/types/ppt';

/**
 * Estes testes protegem as REGRAS DO PROGRAMA, não a renderização.
 * Se um deles quebrar, alguém mudou o cálculo que define pagamento.
 */

function kpi(id: KpiId, meta: number, real: number, sellIn: number, parcial?: Partial<KpiState>): KpiState {
  const ating = meta > 0 ? real / meta : 0;
  const prox = proximoDegrau(ating);
  return {
    id,
    label: id,
    unidade: id === 'volume' ? 'ton' : 'PDVs',
    meta,
    real,
    ating,
    fator: fatorPremio(ating),
    peso: PESOS[id],
    premio: sellIn * PESOS[id] * fatorPremio(ating),
    proxDegrau: prox,
    gapProxDegrau: prox === 0 ? 0 : Math.max(0, Math.ceil(meta * prox) - real),
    ganhoProxDegrau: prox === 0 ? 0 : sellIn * PESOS[id] * (fatorPremio(prox) - fatorPremio(ating)),
    gap100: Math.max(0, meta - real),
    projetado: real,
    atingProjetado: ating,
    ...parcial,
  };
}

function resumo(overrides?: Partial<PptSummary>): PptSummary {
  const sellIn = 1_000_000;
  return {
    distribuidorId: 'D001',
    distribuidorNome: 'Distribuidora 01',
    regiaoNome: 'São Paulo',
    executivoNome: 'Executivo 01',
    anoMes: '2026-08',
    sellIn,
    kpis: {
      positivacao: kpi('positivacao', 100, 88, sellIn),
      volume: kpi('volume', 50, 46, sellIn),
      mixHero: kpi('mixHero', 40, 30, sellIn),
    },
    premioTotal: 0,
    premioPotencial: sellIn * PESO_TOTAL,
    premioNaoCapturado: 0,
    premioProjetado: 0,
    ganhoProxDegrauTotal: 0,
    statusRisco: 'Atencao',
    diasUteisDecorridos: 10,
    diasUteisTotais: 22,
    consolidado: false,
    qtdDistribuidores: 1,
    ...overrides,
  };
}

describe('escalonamento do PPT', () => {
  it('aplica os três degraus e o zero abaixo de 90%', () => {
    expect(fatorPremio(0.899)).toBe(0);
    expect(fatorPremio(0.9)).toBe(0.5);
    expect(fatorPremio(0.949)).toBe(0.5);
    expect(fatorPremio(0.95)).toBe(0.7);
    expect(fatorPremio(0.999)).toBe(0.7);
    expect(fatorPremio(1)).toBe(1);
    expect(fatorPremio(1.4)).toBe(1);
  });

  it('os pesos somam exatamente 2% do sell-in', () => {
    expect(PESOS.positivacao + PESOS.volume + PESOS.mixHero).toBeCloseTo(PESO_TOTAL, 10);
  });

  it('aponta sempre o degrau imediatamente à frente', () => {
    expect(proximoDegrau(0.5)).toBe(0.9);
    expect(proximoDegrau(0.91)).toBe(0.95);
    expect(proximoDegrau(0.97)).toBe(1);
    expect(proximoDegrau(1.05)).toBe(0);
  });

  it('nunca paga acima do teto de 2%', () => {
    const sellIn = 500_000;
    const premio =
      sellIn * PESOS.positivacao * fatorPremio(1.5) +
      sellIn * PESOS.volume * fatorPremio(2) +
      sellIn * PESOS.mixHero * fatorPremio(3);
    expect(premio).toBeCloseTo(sellIn * PESO_TOTAL, 6);
  });
});

describe('gap para o próximo degrau', () => {
  it('arredonda PDVs para cima — meio PDV não existe', () => {
    // meta 100, real 88 -> degrau 90% exige 90 PDVs -> faltam 2
    expect(pdvsParaProximoDegrau(100, 88)).toBe(2);
    // meta 37, real 33 -> 90% de 37 = 33,3 -> ceil 34 -> falta 1
    expect(pdvsParaProximoDegrau(37, 33)).toBe(1);
  });

  it('devolve zero quando a meta já foi atingida', () => {
    expect(pdvsParaProximoDegrau(100, 100)).toBe(0);
    expect(pdvsParaProximoDegrau(100, 130)).toBe(0);
  });
});

describe('simulação de positivação', () => {
  it('cruzar o degrau muda o prêmio em salto, não linearmente', () => {
    const r = resumo();
    // 88/100 = 88% -> sem prêmio. +2 PDVs = 90% -> paga 50%.
    const antes = simularPositivacao(r, 1);
    const depois = simularPositivacao(r, 2);
    expect(antes.ganho).toBe(0);
    expect(depois.ganho).toBeCloseTo(r.sellIn * PESOS.positivacao * 0.5, 6);
  });

  it('não gera ganho negativo', () => {
    const r = resumo();
    expect(simularPositivacao(r, 0).ganho).toBeGreaterThanOrEqual(0);
  });
});

describe('motor de insights', () => {
  const entradaBase = {
    resumo: resumo(),
    oportunidadesPositivacao: [],
    oportunidadesHero: [],
    oportunidadesRecuperacao: [],
  };

  it('quantifica o gap de positivação em PDVs e em reais', () => {
    const insights = gerarInsights(entradaBase, 10);
    const gap = insights.find((i) => i.id === 'gap-positivacao');
    expect(gap).toBeDefined();
    expect(gap!.texto).toContain('2 PDVs');
    expect(gap!.texto).toContain('90%');
  });

  it('avisa quando um KPI projeta fechar sem premiação', () => {
    const sellIn = 1_000_000;
    // Só o Mix Hero em risco: os outros dois já projetam dentro da faixa paga.
    const r = resumo({
      kpis: {
        positivacao: kpi('positivacao', 100, 96, sellIn),
        volume: kpi('volume', 50, 50, sellIn),
        mixHero: kpi('mixHero', 40, 30, sellIn, { atingProjetado: 0.75 }),
      },
    });
    const insights = gerarInsights({ ...entradaBase, resumo: r }, 10);
    const risco = insights.find((i) => i.id === 'kpi-em-risco');
    expect(risco).toBeDefined();
    expect(risco!.severidade).toBe('critico');
    expect(risco!.impactoReais).toBeCloseTo(sellIn * PESOS.mixHero, 6);
    expect(risco!.texto).toContain('não paga');
  });

  it('soma o valor em risco quando mais de um KPI projeta abaixo de 90%', () => {
    // O resumo base tem positivação em 88% e Mix Hero em 75%: os dois caem.
    const r = resumo();
    const risco = gerarInsights({ ...entradaBase, resumo: r }, 10).find(
      (i) => i.id === 'kpi-em-risco',
    );
    expect(risco).toBeDefined();
    expect(risco!.impactoReais).toBeCloseTo(r.sellIn * (PESOS.positivacao + PESOS.mixHero), 6);
    expect(risco!.texto).toContain('não pagam');
  });

  it('conta os PDVs que sumiram e soma o volume histórico', () => {
    const insights = gerarInsights(
      {
        ...entradaBase,
        oportunidadesPositivacao: [
          {
            chave: '1',
            cnpj: '1',
            pdv: 'Mercado X',
            canal: 'Varejo Tradicional',
            cidade: 'Campinas',
            ultimaCompra: '2026-07-20',
            diasSemComprar: 25,
            mesesAtivosU3M: 3,
            mediaU3MTon: 0.4,
            mediaU3MValor: 16_000,
            volumePotencialPerdidoTon: 0.4,
            eraHero: true,
            valorPorPdvRecuperado: 1_750,
            score: 82,
            prioridade: 'Critico',
          },
        ],
      },
      10,
    );
    const sumiram = insights.find((i) => i.id === 'pdvs-sumiram');
    expect(sumiram).toBeDefined();
    expect(sumiram!.texto).toContain('1 PDV');
    expect(sumiram!.texto).toContain('400 kg');
  });

  it('diz qual categoria Hero destrava mais PDVs e onde isso coloca o KPI', () => {
    const insights = gerarInsights(
      {
        ...entradaBase,
        oportunidadesHero: [1, 2, 3].map((n) => ({
          chave: `c${n}`,
          cnpj: `${n}`,
          pdv: `PDV ${n}`,
          canal: 'Varejo Tradicional',
          categoriaFaltante: 'Cat 1 - Ricota',
          categoriaNum: 1,
          categoriasFaltantesQtd: 1,
          converteSozinho: true,
          skuRecomendado: 'TZ-CR-200',
          skuDescricao: 'Creme de Ricota Tradicional 200g',
          motivo: 'Mais vendido no canal',
          volumeEstimadoTon: 0.05,
          valorPorConversao: 600,
          score: 80 - n,
          prioridade: 'Critico' as const,
        })),
      },
      10,
    );
    const alavanca = insights.find((i) => i.id === 'hero-categoria-alavanca');
    expect(alavanca).toBeDefined();
    // 30 reais + 3 conversões sobre meta 40 = 82,5% -> arredonda para 83%
    expect(alavanca!.texto).toContain('Ricota');
    expect(alavanca!.texto).toContain('3 PDVs');
    expect(alavanca!.texto).toContain('83%');
  });

  it('ordena por impacto e respeita o limite', () => {
    const insights = gerarInsights(entradaBase, 2);
    expect(insights).toHaveLength(2);
    expect(insights[0]!.peso).toBeGreaterThanOrEqual(insights[1]!.peso);
  });

  it('não quebra sem resumo', () => {
    expect(() =>
      gerarInsights({
        resumo: null,
        oportunidadesPositivacao: [],
        oportunidadesHero: [],
        oportunidadesRecuperacao: [],
      }),
    ).not.toThrow();
  });

  it('celebra o teto sem sugerir ação inexistente', () => {
    const sellIn = 1_000_000;
    const r = resumo({
      kpis: {
        positivacao: kpi('positivacao', 100, 105, sellIn),
        volume: kpi('volume', 50, 55, sellIn),
        mixHero: kpi('mixHero', 40, 42, sellIn),
      },
      premioTotal: sellIn * PESO_TOTAL,
      premioPotencial: sellIn * PESO_TOTAL,
      statusRisco: 'No alvo',
    });
    const insights = gerarInsights({ ...entradaBase, resumo: r }, 10);
    expect(insights.some((i) => i.id === 'tudo-no-alvo')).toBe(true);
    expect(insights.some((i) => i.id === 'gap-positivacao')).toBe(false);
  });
});
