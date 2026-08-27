/**
 * Formatação pt-BR centralizada. Nenhum componente chama toLocaleString direto —
 * número de premiação formatado de dois jeitos diferentes na mesma tela é a
 * forma mais rápida de perder a confiança do distribuidor.
 */

const LOCALE = 'pt-BR';

const fmtMoeda = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtMoedaCurta = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fmtInteiro = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

const fmtDecimal1 = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const fmtDecimal2 = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function moeda(v: number | null | undefined): string {
  return fmtMoeda.format(Number.isFinite(v) ? (v as number) : 0);
}

/** R$ 1,2 mi — para cards onde o valor exato atrapalha a leitura. */
export function moedaCurta(v: number | null | undefined): string {
  return fmtMoedaCurta.format(Number.isFinite(v) ? (v as number) : 0);
}

export function inteiro(v: number | null | undefined): string {
  return fmtInteiro.format(Number.isFinite(v) ? (v as number) : 0);
}

export function decimal(v: number | null | undefined, casas: 1 | 2 = 1): string {
  const n = Number.isFinite(v) ? (v as number) : 0;
  return casas === 1 ? fmtDecimal1.format(n) : fmtDecimal2.format(n);
}

/** 0.9432 -> "94,3%" */
export function percentual(v: number | null | undefined, casas = 1): string {
  const n = Number.isFinite(v) ? (v as number) : 0;
  return `${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(n * 100)}%`;
}

/** Toneladas com unidade. Abaixo de 1t mostra em kg — 0,04t não diz nada a um vendedor. */
export function toneladas(v: number | null | undefined): string {
  const n = Number.isFinite(v) ? (v as number) : 0;
  if (Math.abs(n) > 0 && Math.abs(n) < 1) return `${inteiro(n * 1000)} kg`;
  return `${decimal(n, 1)} t`;
}

/** "2026-08" -> "ago/26" */
export function labelMes(anoMes: string): string {
  const parts = anoMes.split('-');
  const ano = parts[0];
  const mes = parts[1];
  if (!ano || !mes) return anoMes;
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const idx = Number(mes) - 1;
  return `${nomes[idx] ?? mes}/${ano.slice(2)}`;
}

/** 14 dígitos -> 00.000.000/0000-00 */
export function cnpj(valor: string): string {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 14) return valor;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** "2026-08-14" ou ISO -> "14/08/2026" */
export function dataCurta(valor: string | null | undefined): string {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Plural simples: pluralizar(1,'PDV','PDVs') -> "1 PDV" */
export function pluralizar(n: number, singular: string, plural: string): string {
  return `${inteiro(n)} ${n === 1 ? singular : plural}`;
}
