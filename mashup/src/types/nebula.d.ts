/**
 * Os charts do Nebula são publicados sem tipos. Declaramos o mínimo para não
 * perder o strict do resto do projeto por causa de dois imports.
 */
declare module '@nebula.js/sn-line-chart' {
  const supernova: unknown;
  export default supernova;
}

declare module '@nebula.js/sn-bar-chart' {
  const supernova: unknown;
  export default supernova;
}
