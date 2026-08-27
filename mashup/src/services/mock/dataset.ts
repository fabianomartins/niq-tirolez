/**
 * Base sintética do PPT para rodar o cockpit sem tenant Qlik.
 *
 * Reproduz as MESMAS regras do script de carga (qlik/script/): composição Hero
 * por região, degraus de premiação, projeção por dias úteis e os três motores
 * de oportunidade. Serve para desenvolvimento, demo e para os testes do motor
 * de insights — não é dado de negócio.
 *
 * Determinística: o mesmo mês gera sempre os mesmos números.
 */

import { fatorPremio, proximoDegrau, PESOS, PESO_TOTAL } from '@/lib/status';

/** Hash pseudo-aleatório determinístico em [0,1). Mesma técnica do script Qlik. */
function h(...seeds: number[]): number {
  let x = 0;
  for (let i = 0; i < seeds.length; i += 1) x += (seeds[i] ?? 0) * (12.9898 + i * 7.233);
  const v = Math.sin(x + 78.233) * 43758.5453;
  return Math.abs(v - Math.floor(v));
}

export const REGIOES = [
  { id: '1', nome: 'São Paulo', heroComposicao: 'SP' as const, lat: -23.55, lon: -46.63 },
  { id: '2', nome: 'Sul', heroComposicao: 'DEMAIS' as const, lat: -25.43, lon: -49.27 },
  { id: '3', nome: 'Sudeste', heroComposicao: 'DEMAIS' as const, lat: -19.92, lon: -43.94 },
  { id: '4', nome: 'Centro-Oeste', heroComposicao: 'DEMAIS' as const, lat: -16.69, lon: -49.26 },
  { id: '5', nome: 'Nordeste', heroComposicao: 'DEMAIS' as const, lat: -8.05, lon: -34.88 },
  { id: '6', nome: 'Norte', heroComposicao: 'DEMAIS' as const, lat: -1.46, lon: -48.5 },
];

const SKUS_POR_CATEGORIA: Record<'SP' | 'DEMAIS', [string[], string[], string[]]> = {
  SP: [
    ['TZ-CR-200|Creme de Ricota Tradicional 200g', 'TZ-CRL-200|Creme de Ricota Light 200g'],
    ['TZ-RQ-200|Requeijão Cremoso 200g', 'TZ-RQL-400|Requeijão Light 400g'],
    ['TZ-PRF-150|Prato Fatiado 150g', 'TZ-MUF-150|Mussarela Fatiada 150g'],
  ],
  DEMAIS: [
    ['TZ-CR-400|Creme de Ricota Tradicional 400g', 'TZ-CRL-200|Creme de Ricota Light 200g'],
    ['TZ-RQ-400|Requeijão Cremoso 400g', 'TZ-RQ-1800|Requeijão Cremoso Balde 1,8kg'],
    ['TZ-MTC-200|Manteiga Com Sal 200g', 'TZ-MTS-500|Manteiga Sem Sal 500g'],
  ],
};

const CANAIS = ['Varejo Tradicional', 'Varejo Tradicional', 'Padaria e Conveniência', 'Atacado e Food Service'];

const NOMES_A = ['Mercado', 'Supermercado', 'Empório', 'Mercearia', 'Padaria', 'Minimercado', 'Adega', 'Casa de Frios'];
const NOMES_B = ['São Jorge', 'Boa Vista', 'Central', 'do Bairro', 'Progresso', 'Estrela', 'União', 'Popular', 'Família', 'Bom Preço'];

const CIDADES: Record<string, string[]> = {
  '1': ['São Paulo', 'Campinas', 'Ribeirão Preto', 'Santos', 'Sorocaba'],
  '2': ['Curitiba', 'Porto Alegre', 'Florianópolis', 'Londrina', 'Caxias do Sul'],
  '3': ['Belo Horizonte', 'Rio de Janeiro', 'Vitória', 'Uberlândia', 'Juiz de Fora'],
  '4': ['Goiânia', 'Brasília', 'Campo Grande', 'Cuiabá', 'Anápolis'],
  '5': ['Recife', 'Salvador', 'Fortaleza', 'Natal', 'São Luís'],
  '6': ['Belém', 'Manaus', 'Porto Velho', 'Palmas', 'Rio Branco'],
};

const QTD_DISTRIBUIDORES = 12;
const QTD_PDVS = 600;
const QTD_MESES = 12;

export interface MockDistribuidor {
  id: string;
  nome: string;
  regiaoId: string;
  regiaoNome: string;
  heroComposicao: 'SP' | 'DEMAIS';
  executivoNome: string;
  lat: number;
  lon: number;
}

export interface MockPdv {
  cnpj: string;
  fantasia: string;
  canal: string;
  cidade: string;
  distribuidorId: string;
  qualidade: number;
}

export interface MockPdvMes {
  cnpj: string;
  distribuidorId: string;
  anoMes: string;
  comprou: boolean;
  cats: [boolean, boolean, boolean];
  volumeTon: number;
  valor: number;
  ultimaCompra: string;
}

export interface MockCompetencia {
  distribuidorId: string;
  anoMes: string;
  sellIn: number;
  metaPos: number;
  realPos: number;
  metaVol: number;
  realVol: number;
  metaHero: number;
  realHero: number;
  diasUteisDecorridos: number;
  diasUteisTotais: number;
}

/* -------------------------------------------------------------------------- */
/* Geração                                                                     */
/* -------------------------------------------------------------------------- */

function listaMeses(hoje: Date): string[] {
  const out: string[] = [];
  for (let i = QTD_MESES - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function diasUteisDoMes(ano: number, mes: number): number {
  let total = 0;
  const dias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  for (let d = 1; d <= dias; d += 1) {
    const wd = new Date(Date.UTC(ano, mes - 1, d)).getUTCDay();
    if (wd !== 0 && wd !== 6) total += 1;
  }
  return total;
}

function diasUteisDecorridos(ano: number, mes: number, hoje: Date): number {
  const mesCorrente = hoje.getUTCFullYear() === ano && hoje.getUTCMonth() + 1 === mes;
  if (!mesCorrente) {
    const passou =
      ano < hoje.getUTCFullYear() || (ano === hoje.getUTCFullYear() && mes < hoje.getUTCMonth() + 1);
    return passou ? diasUteisDoMes(ano, mes) : 0;
  }
  let total = 0;
  for (let d = 1; d <= hoje.getUTCDate(); d += 1) {
    const wd = new Date(Date.UTC(ano, mes - 1, d)).getUTCDay();
    if (wd !== 0 && wd !== 6) total += 1;
  }
  return Math.max(total, 1);
}

export interface MockDataset {
  hoje: Date;
  meses: string[];
  mesAtual: string;
  distribuidores: MockDistribuidor[];
  pdvs: MockPdv[];
  pdvMeses: MockPdvMes[];
  competencias: MockCompetencia[];
}

export function gerarDataset(hoje = new Date()): MockDataset {
  const meses = listaMeses(hoje);
  const mesAtual = meses[meses.length - 1]!;

  const distribuidores: MockDistribuidor[] = Array.from({ length: QTD_DISTRIBUIDORES }, (_, i) => {
    const regiao = REGIOES[i % REGIOES.length]!;
    return {
      id: `D${String(i + 1).padStart(3, '0')}`,
      nome: `Distribuidora ${String(i + 1).padStart(2, '0')}`,
      regiaoId: regiao.id,
      regiaoNome: regiao.nome,
      heroComposicao: regiao.heroComposicao,
      executivoNome: `Executivo ${String((i % 8) + 1).padStart(2, '0')}`,
      lat: regiao.lat + (h(i, 7.7) - 0.5) * 2,
      lon: regiao.lon + (h(i, 8.8) - 0.5) * 2,
    };
  });

  const pdvs: MockPdv[] = Array.from({ length: QTD_PDVS }, (_, i) => {
    const idx = i + 1;
    const dist = distribuidores[Math.floor(h(idx, 2.71) * QTD_DISTRIBUIDORES)]!;
    const cidadesDaRegiao = CIDADES[dist.regiaoId] ?? ['Não informada'];
    return {
      cnpj: `${String(20000000 + idx * 7).padStart(8, '0')}0001${String((idx * 31) % 90 + 10).padStart(2, '0')}`,
      fantasia: `${NOMES_A[idx % NOMES_A.length]} ${NOMES_B[Math.floor(idx / NOMES_A.length) % NOMES_B.length]}`,
      canal: CANAIS[Math.floor(h(idx, 6.13) * CANAIS.length)]!,
      cidade: cidadesDaRegiao[Math.floor(h(idx, 3.31) * cidadesDaRegiao.length)]!,
      distribuidorId: dist.id,
      qualidade: h(idx, 1.17),
    };
  });

  // ---- PDV x mês ---------------------------------------------------------
  const pdvMeses: MockPdvMes[] = [];
  pdvs.forEach((pdv, pi) => {
    meses.forEach((anoMes, mi) => {
      const q = pdv.qualidade;
      const comprou = h(pi + 1, mi + 1, 31.41) < 0.55 + q * 0.4;
      if (!comprou) {
        pdvMeses.push({
          cnpj: pdv.cnpj,
          distribuidorId: pdv.distribuidorId,
          anoMes,
          comprou: false,
          cats: [false, false, false],
          volumeTon: 0,
          valor: 0,
          ultimaCompra: '',
        });
        return;
      }
      const cats: [boolean, boolean, boolean] = [
        h(pi + 1, mi + 1, 17.19) < 0.35 + q * 0.45,
        h(pi + 1, mi + 1, 19.23) < 0.45 + q * 0.45,
        h(pi + 1, mi + 1, 23.29) < 0.3 + q * 0.5,
      ];
      const base = 0.05 + q * 0.85;
      const volumeTon = Number((base * (0.6 + h(pi + 1, mi + 1, 11.31) * 0.9)).toFixed(4));
      const [ano, mes] = anoMes.split('-').map(Number) as [number, number];
      const maxDia =
        anoMes === mesAtual ? hoje.getUTCDate() : new Date(Date.UTC(ano, mes, 0)).getUTCDate();
      const dia = Math.max(1, Math.floor(h(pi + 1, mi + 1, 37.51) * maxDia) + 1);
      pdvMeses.push({
        cnpj: pdv.cnpj,
        distribuidorId: pdv.distribuidorId,
        anoMes,
        comprou: true,
        cats,
        volumeTon,
        valor: Number((volumeTon * 42000).toFixed(2)),
        ultimaCompra: `${anoMes}-${String(Math.min(dia, maxDia)).padStart(2, '0')}`,
      });
    });
  });

  // ---- Competências (distribuidor x mês) ---------------------------------
  const porDistMes = new Map<string, MockPdvMes[]>();
  for (const pm of pdvMeses) {
    if (!pm.comprou) continue;
    const k = `${pm.distribuidorId}|${pm.anoMes}`;
    const arr = porDistMes.get(k);
    if (arr) arr.push(pm);
    else porDistMes.set(k, [pm]);
  }

  const competencias: MockCompetencia[] = [];
  for (const dist of distribuidores) {
    let anteriorPos = 0;
    let anteriorVol = 0;
    let anteriorHero = 0;
    let anteriorValor = 0;

    meses.forEach((anoMes, mi) => {
      const linhas = porDistMes.get(`${dist.id}|${anoMes}`) ?? [];
      const realPos = linhas.length;
      const realVol = Number(linhas.reduce((s, l) => s + l.volumeTon, 0).toFixed(3));
      const realHero = linhas.filter((l) => l.cats[0] && l.cats[1] && l.cats[2]).length;
      const realValor = linhas.reduce((s, l) => s + l.valor, 0);

      const basePos = mi === 0 ? realPos : anteriorPos;
      const baseVol = mi === 0 ? realVol : anteriorVol;
      const baseHero = mi === 0 ? realHero : anteriorHero;
      const baseValor = mi === 0 ? realValor : anteriorValor;

      const [ano, mes] = anoMes.split('-').map(Number) as [number, number];
      const seed = Number(dist.id.slice(1)) * 97 + mi;

      competencias.push({
        distribuidorId: dist.id,
        anoMes,
        // Sell-in do mês corrente ainda em curso: usa o mês anterior como base.
        sellIn: Number(((anoMes === mesAtual ? baseValor : realValor) * 0.78).toFixed(2)),
        metaPos: Math.max(1, Math.round(basePos * (0.88 + h(seed, 12.98) * 0.37))),
        realPos,
        metaVol: Math.max(0.001, Number((baseVol * (0.88 + h(seed, 15.31) * 0.37)).toFixed(3))),
        realVol,
        metaHero: Math.max(1, Math.round(baseHero * (0.85 + h(seed, 18.77) * 0.4))),
        realHero,
        diasUteisDecorridos: diasUteisDecorridos(ano, mes, hoje),
        diasUteisTotais: diasUteisDoMes(ano, mes),
      });

      anteriorPos = realPos;
      anteriorVol = realVol;
      anteriorHero = realHero;
      anteriorValor = realValor;
    });
  }

  return { hoje, meses, mesAtual, distribuidores, pdvs, pdvMeses, competencias };
}

/* -------------------------------------------------------------------------- */
/* Derivações — replicam FACT_PPT_MENSAL                                       */
/* -------------------------------------------------------------------------- */

export interface CompetenciaCalculada extends MockCompetencia {
  atingPos: number;
  atingVol: number;
  atingHero: number;
  premioPos: number;
  premioVol: number;
  premioHero: number;
  premioTotal: number;
  premioPotencial: number;
  premioNaoCapturado: number;
  premioProjetado: number;
  projPos: number;
  projVol: number;
  projHero: number;
  atingProjPos: number;
  atingProjVol: number;
  atingProjHero: number;
  proxDegrauPos: number;
  proxDegrauVol: number;
  proxDegrauHero: number;
  gapPos: number;
  gapVol: number;
  gapHero: number;
  ganhoPos: number;
  ganhoVol: number;
  ganhoHero: number;
  ganhoTotal: number;
  gap100Pos: number;
  gap100Vol: number;
  gap100Hero: number;
  statusRisco: 'No alvo' | 'Atencao' | 'Risco alto';
}

function ganhoDegrau(ating: number, sellIn: number, peso: number): number {
  const prox = proximoDegrau(ating);
  if (prox === 0) return 0;
  return Number((sellIn * peso * (fatorPremio(prox) - fatorPremio(ating))).toFixed(2));
}

export function calcularCompetencia(c: MockCompetencia): CompetenciaCalculada {
  const atingPos = c.metaPos > 0 ? c.realPos / c.metaPos : 0;
  const atingVol = c.metaVol > 0 ? c.realVol / c.metaVol : 0;
  const atingHero = c.metaHero > 0 ? c.realHero / c.metaHero : 0;

  const ratio = c.diasUteisDecorridos > 0 ? c.diasUteisTotais / c.diasUteisDecorridos : 1;
  const projPos = Math.round(c.realPos * ratio);
  const projVol = Number((c.realVol * ratio).toFixed(3));
  const projHero = Math.round(c.realHero * ratio);

  const atingProjPos = c.metaPos > 0 ? projPos / c.metaPos : 0;
  const atingProjVol = c.metaVol > 0 ? projVol / c.metaVol : 0;
  const atingProjHero = c.metaHero > 0 ? projHero / c.metaHero : 0;

  const premioPos = Number((c.sellIn * PESOS.positivacao * fatorPremio(atingPos)).toFixed(2));
  const premioVol = Number((c.sellIn * PESOS.volume * fatorPremio(atingVol)).toFixed(2));
  const premioHero = Number((c.sellIn * PESOS.mixHero * fatorPremio(atingHero)).toFixed(2));
  const premioTotal = Number((premioPos + premioVol + premioHero).toFixed(2));
  const premioPotencial = Number((c.sellIn * PESO_TOTAL).toFixed(2));

  const proxPos = proximoDegrau(atingPos);
  const proxVol = proximoDegrau(atingVol);
  const proxHero = proximoDegrau(atingHero);

  const fatorMinProjetado = Math.min(
    fatorPremio(atingProjPos),
    fatorPremio(atingProjVol),
    fatorPremio(atingProjHero),
  );

  const ganhoPos = ganhoDegrau(atingPos, c.sellIn, PESOS.positivacao);
  const ganhoVol = ganhoDegrau(atingVol, c.sellIn, PESOS.volume);
  const ganhoHero = ganhoDegrau(atingHero, c.sellIn, PESOS.mixHero);

  return {
    ...c,
    atingPos,
    atingVol,
    atingHero,
    premioPos,
    premioVol,
    premioHero,
    premioTotal,
    premioPotencial,
    premioNaoCapturado: Number((premioPotencial - premioTotal).toFixed(2)),
    premioProjetado: Number(
      (
        c.sellIn *
        (PESOS.positivacao * fatorPremio(atingProjPos) +
          PESOS.volume * fatorPremio(atingProjVol) +
          PESOS.mixHero * fatorPremio(atingProjHero))
      ).toFixed(2),
    ),
    projPos,
    projVol,
    projHero,
    atingProjPos,
    atingProjVol,
    atingProjHero,
    proxDegrauPos: proxPos,
    proxDegrauVol: proxVol,
    proxDegrauHero: proxHero,
    gapPos: proxPos === 0 ? 0 : Math.max(0, Math.ceil(c.metaPos * proxPos) - c.realPos),
    gapVol: proxVol === 0 ? 0 : Number(Math.max(0, c.metaVol * proxVol - c.realVol).toFixed(3)),
    gapHero: proxHero === 0 ? 0 : Math.max(0, Math.ceil(c.metaHero * proxHero) - c.realHero),
    ganhoPos,
    ganhoVol,
    ganhoHero,
    ganhoTotal: Number((ganhoPos + ganhoVol + ganhoHero).toFixed(2)),
    gap100Pos: Math.max(0, c.metaPos - c.realPos),
    gap100Vol: Number(Math.max(0, c.metaVol - c.realVol).toFixed(3)),
    gap100Hero: Math.max(0, c.metaHero - c.realHero),
    statusRisco: fatorMinProjetado === 0 ? 'Risco alto' : fatorMinProjetado < 1 ? 'Atencao' : 'No alvo',
  };
}

export function skuRecomendado(
  composicao: 'SP' | 'DEMAIS',
  catNum: number,
  seed: number,
): { codigo: string; descricao: string } {
  const lista = SKUS_POR_CATEGORIA[composicao][Math.min(catNum, 3) - 1] ?? [];
  const escolhido = lista[Math.floor(h(seed, 5.5) * lista.length)] ?? 'TZ-000|SKU';
  const partes = escolhido.split('|');
  return { codigo: partes[0] ?? 'TZ-000', descricao: partes[1] ?? 'SKU' };
}

export { h as hashDeterministico };
