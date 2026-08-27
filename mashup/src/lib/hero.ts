/**
 * Composição do Mix Hero — espelho de qlik/script/05-hero-map.qvs.
 *
 * A regra vive no script de carga; isto aqui é só rotulagem para a UI. Se as
 * duas listas divergirem, o teste QA-07 (docs/07-qa-checklist.md) acusa.
 */

export type ComposicaoHero = 'SP' | 'DEMAIS';

export const CATEGORIAS_HERO: Record<ComposicaoHero, [string, string, string]> = {
  SP: ['Cat 1 - Ricota', 'Cat 2 - Requeijão', 'Cat 3 - Fatiados'],
  DEMAIS: ['Cat 1 - Ricota', 'Cat 2 - Requeijão', 'Cat 3 - Manteiga'],
};

/** SKUs de cada categoria, por composição regional. */
export const SKUS_HERO: Record<ComposicaoHero, [string[], string[], string[]]> = {
  SP: [
    ['Creme Ricota', 'Creme Ricota Light'],
    ['Requeijão', 'Requeijão Light'],
    ['Mussarela Fatiada', 'Mussarela Light', 'Prato Fatiado', 'Prato Light'],
  ],
  DEMAIS: [
    ['Creme Ricota', 'Creme Ricota Light'],
    ['Requeijão', 'Requeijão Light'],
    ['Manteiga Com Sal', 'Manteiga Sem Sal'],
  ],
};

/** Rótulos usados quando o recorte mistura regiões com composições diferentes. */
export const CATEGORIAS_HERO_MISTAS: [string, string, string] = [
  'Cat 1 - Ricota',
  'Cat 2 - Requeijão',
  'Cat 3 - Fatiados / Manteiga',
];

/** Um PDV é Hero quando comprou ao menos 1 SKU de cada uma das 3 categorias. */
export function ehHero(cats: readonly boolean[]): boolean {
  return cats.length === 3 && cats.every(Boolean);
}
