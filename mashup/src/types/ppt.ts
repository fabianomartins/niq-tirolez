/**
 * Contratos de dados do PPT.
 *
 * A camada visual NUNCA conhece nome de campo Qlik. Ela consome estes tipos.
 * O mapeamento campo -> tipo vive em src/services/hypercubes/.
 */

export type StatusFaixa = 'meta' | 'premiada' | 'risco' | 'abaixo' | 'neutro';

export type StatusRisco = 'No alvo' | 'Atencao' | 'Risco alto';

export type PrioridadeOportunidade = 'Critico' | 'Alto' | 'Medio' | 'Baixo';

export type KpiId = 'positivacao' | 'volume' | 'mixHero';

/** Estado completo de um KPI do programa em um distribuidor-mês. */
export interface KpiState {
  id: KpiId;
  /** Rótulo curto para UI. */
  label: string;
  /** Unidade em que meta e realizado são expressos. */
  unidade: 'PDVs' | 'ton';
  meta: number;
  real: number;
  /** Realizado / meta. 1 = 100%. */
  ating: number;
  /** Fator de escalonamento já aplicado: 0, 0.5, 0.7 ou 1. */
  fator: number;
  /** Peso do KPI sobre o sell-in (0.007, 0.007, 0.006). */
  peso: number;
  premio: number;
  /** Próximo degrau perseguido (0.9, 0.95, 1) ou 0 se já está no topo. */
  proxDegrau: number;
  /** Quanto falta, na unidade do KPI, para cruzar o próximo degrau. */
  gapProxDegrau: number;
  /** Quantos R$ entram ao cruzar o próximo degrau. */
  ganhoProxDegrau: number;
  /** Quanto falta para 100% da meta. */
  gap100: number;
  /** Projeção de fechamento pelo ritmo de dias úteis. */
  projetado: number;
  atingProjetado: number;
}

/** Uma linha de FACT_PPT_MENSAL já traduzida para a UI. */
export interface PptSummary {
  distribuidorId: string;
  distribuidorNome: string;
  regiaoNome: string;
  executivoNome: string;
  anoMes: string;
  sellIn: number;
  kpis: Record<KpiId, KpiState>;
  premioTotal: number;
  premioPotencial: number;
  premioNaoCapturado: number;
  premioProjetado: number;
  /** Soma dos ganhos dos três próximos degraus. */
  ganhoProxDegrauTotal: number;
  statusRisco: StatusRisco;
  diasUteisDecorridos: number;
  diasUteisTotais: number;
  /**
   * True quando o resumo agrega mais de um distribuidor. Muda a leitura dos
   * gaps: em carteira, cada distribuidor persegue o próprio degrau, então
   * "faltam N PDVs para 95%" não faz sentido — o que soma é o esforço total.
   */
  consolidado: boolean;
  qtdDistribuidores: number;
}

/** Ponto da série de evolução mensal. */
export interface EvolucaoPonto {
  anoMes: string;
  label: string;
  atingPositivacao: number;
  atingVolume: number;
  atingMixHero: number;
  premioTotal: number;
  premioPotencial: number;
}

/** Linha da Tela 2 — oportunidades de positivação. */
export interface OportunidadePositivacao {
  chave: string;
  cnpj: string;
  pdv: string;
  canal: string;
  cidade: string;
  ultimaCompra: string;
  diasSemComprar: number;
  mesesAtivosU3M: number;
  mediaU3MTon: number;
  mediaU3MValor: number;
  volumePotencialPerdidoTon: number;
  eraHero: boolean;
  valorPorPdvRecuperado: number;
  score: number;
  prioridade: PrioridadeOportunidade;
}

/** Linha da Tela 5 — potencial de recuperação. */
export interface OportunidadeRecuperacao {
  chave: string;
  cnpj: string;
  pdv: string;
  canal: string;
  mediaU3MTon: number;
  volumeMesTon: number;
  quedaTon: number;
  quedaPerc: number;
  coberturaDoGap: number;
  valorPotencial: number;
  score: number;
  prioridade: PrioridadeOportunidade;
}

/** Status de uma categoria Hero em um PDV. */
export type HeroCelula = 'comprou' | 'falta';

/** Linha da matriz da Tela 3 — a batalha naval. */
export interface HeroMatrixRow {
  chave: string;
  cnpj: string;
  pdv: string;
  canal: string;
  regiaoHero: 'SP' | 'DEMAIS';
  /** Índice 0 = categoria 1, 1 = categoria 2, 2 = categoria 3. */
  categorias: [HeroCelula, HeroCelula, HeroCelula];
  qtdCategorias: number;
  status: 'Completo' | 'Falta 1' | 'Falta 2+' | 'Sem compra Hero';
  volumeTon: number;
  categoriasFaltantes: string;
}

/** Recomendação da Tela 4. */
export interface RecomendacaoHero {
  chave: string;
  cnpj: string;
  pdv: string;
  canal: string;
  categoriaFaltante: string;
  categoriaNum: number;
  categoriasFaltantesQtd: number;
  /** True quando vender este SKU sozinho já converte o PDV em Hero. */
  converteSozinho: boolean;
  skuRecomendado: string;
  skuDescricao: string;
  motivo: string;
  volumeEstimadoTon: number;
  valorPorConversao: number;
  score: number;
  prioridade: PrioridadeOportunidade;
}

/** Linha da tabela de distribuidores (Telas 1 e 6). */
export interface DistribuidorRow {
  distribuidorId: string;
  distribuidor: string;
  regiao: string;
  executivo: string;
  atingPositivacao: number;
  atingVolume: number;
  atingMixHero: number;
  premioTotal: number;
  premioPotencial: number;
  ganhoProxDegrau: number;
  statusRisco: StatusRisco;
  latitude?: number;
  longitude?: number;
}

/** Insight gerado pelo motor de recomendações. */
export interface Insight {
  id: string;
  /** Ordena a lista: quanto maior, mais cedo aparece. */
  peso: number;
  severidade: 'critico' | 'atencao' | 'positivo' | 'informativo';
  kpi: KpiId | 'geral';
  titulo: string;
  /** Frase pronta para leitura. Sempre no formato "faça X e ganhe Y". */
  texto: string;
  /** Impacto em R$ quando a ação é executada. */
  impactoReais?: number;
  /** Rota do cockpit onde a ação é executada. */
  acaoHref?: string;
  acaoLabel?: string;
}

/** Filtros globais aplicados em todas as telas. */
export interface GlobalFilters {
  anoMes: string | null;
  regiao: string | null;
  executivo: string | null;
  distribuidor: string | null;
  canal: string | null;
}

export const FILTROS_VAZIOS: GlobalFilters = {
  anoMes: null,
  regiao: null,
  executivo: null,
  distribuidor: null,
  canal: null,
};
