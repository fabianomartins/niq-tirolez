import { STATUS_BG, STATUS_COLORS } from './theme';
import type { KpiId, StatusFaixa, StatusRisco } from '@/types/ppt';

/** Regra do programa, em um único lugar do front. */
export const DEGRAUS = [
  { limite: 1.0, fator: 1.0, faixa: 'meta' as StatusFaixa, rotulo: 'Meta atingida' },
  { limite: 0.95, fator: 0.7, faixa: 'premiada' as StatusFaixa, rotulo: 'Paga 70%' },
  { limite: 0.9, fator: 0.5, faixa: 'risco' as StatusFaixa, rotulo: 'Paga 50%' },
] as const;

export const PESOS: Record<KpiId, number> = {
  positivacao: 0.007,
  volume: 0.007,
  mixHero: 0.006,
};

export const PESO_TOTAL = 0.02;

export const KPI_LABEL: Record<KpiId, string> = {
  positivacao: 'Positivação',
  volume: 'Volume Sell Out',
  mixHero: 'Mix Hero',
};

/** Fator de premiação para um percentual de atingimento. */
export function fatorPremio(ating: number): number {
  for (const d of DEGRAUS) if (ating >= d.limite) return d.fator;
  return 0;
}

/** Próximo degrau a perseguir. 0 quando já está em 100%. */
export function proximoDegrau(ating: number): number {
  if (ating >= 1) return 0;
  if (ating >= 0.95) return 1;
  if (ating >= 0.9) return 0.95;
  return 0.9;
}

export function faixaDeAtingimento(ating: number): StatusFaixa {
  for (const d of DEGRAUS) if (ating >= d.limite) return d.faixa;
  return 'abaixo';
}

export function corDeAtingimento(ating: number): string {
  return STATUS_COLORS[faixaDeAtingimento(ating)];
}

export function fundoDeAtingimento(ating: number): string {
  return STATUS_BG[faixaDeAtingimento(ating)];
}

export function rotuloDeAtingimento(ating: number): string {
  const faixa = faixaDeAtingimento(ating);
  const encontrado = DEGRAUS.find((d) => d.faixa === faixa);
  return encontrado ? encontrado.rotulo : 'Sem premiação';
}

export function corDeRisco(status: StatusRisco): string {
  if (status === 'Risco alto') return STATUS_COLORS.abaixo;
  if (status === 'Atencao') return STATUS_COLORS.risco;
  return STATUS_COLORS.meta;
}

export function corDePrioridade(p: string): string {
  if (p === 'Critico') return STATUS_COLORS.abaixo;
  if (p === 'Alto') return STATUS_COLORS.risco;
  if (p === 'Medio') return STATUS_COLORS.premiada;
  return STATUS_COLORS.neutro;
}

/** Cor da célula da matriz Hero (Tela 3). */
export function corHero(qtdCategorias: number): { fg: string; bg: string; simbolo: string } {
  if (qtdCategorias >= 3) return { fg: STATUS_COLORS.meta, bg: STATUS_BG.meta, simbolo: '✓' };
  if (qtdCategorias === 2) return { fg: STATUS_COLORS.risco, bg: STATUS_BG.risco, simbolo: '!' };
  if (qtdCategorias === 1) return { fg: STATUS_COLORS.abaixo, bg: STATUS_BG.abaixo, simbolo: '×' };
  return { fg: STATUS_COLORS.neutro, bg: STATUS_BG.neutro, simbolo: '–' };
}
