/**
 * Tipos mínimos do Engine API usados pelo mashup.
 *
 * Deliberadamente estreitos: só o que a aplicação consome. Depender do tipo
 * completo do enigma.js acopla o front à versão do schema.
 */

export interface QlikCell {
  qText: string;
  qNum: number | 'NaN';
  qElemNumber: number;
  qState: 'L' | 'S' | 'O' | 'X' | 'XS' | 'XL' | 'A';
  qIsNull?: boolean;
}

export interface QlikDataPage {
  qMatrix: QlikCell[][];
  qArea: { qLeft: number; qTop: number; qWidth: number; qHeight: number };
}

export interface QlikHyperCube {
  qSize: { qcx: number; qcy: number };
  qDataPages: QlikDataPage[];
  qDimensionInfo: Array<{ qFallbackTitle: string; qCardinal: number }>;
  qMeasureInfo: Array<{ qFallbackTitle: string; qMin: number; qMax: number }>;
}

export interface QlikLayout {
  qInfo: { qId: string; qType: string };
  qHyperCube: QlikHyperCube;
}

/** Definição declarativa de um hypercube usada pelos serviços. */
export interface HyperCubeDef {
  /** Identificador estável — vira a chave de cache do hook. */
  id: string;
  qDimensions: Array<{
    qDef: { qFieldDefs: string[]; qFieldLabels?: string[] };
    qNullSuppression?: boolean;
  }>;
  qMeasures: Array<{
    qDef: { qDef: string; qLabel?: string };
    qSortBy?: Record<string, number>;
  }>;
  qInitialDataFetch: Array<{ qTop: number; qLeft: number; qHeight: number; qWidth: number }>;
  qSuppressZero?: boolean;
  qSuppressMissing?: boolean;
  qInterColumnSortOrder?: number[];
  qMode?: 'S' | 'P' | 'K';
}

/** Campo + valores a selecionar. */
export interface FieldSelection {
  field: string;
  values: Array<string | number>;
}

/**
 * Abstração da fonte de dados. O EngineProvider fala Engine API; o
 * MockProvider serve dados sintéticos com os mesmos contratos. Nenhum
 * componente sabe qual dos dois está ativo.
 */
export interface QlikDataProvider {
  readonly mode: 'engine' | 'mock';
  /** Executa um hypercube e devolve a matriz bruta. */
  getHyperCubeData(def: HyperCubeDef): Promise<QlikCell[][]>;
  /** Aplica seleções (substitui as do campo). */
  select(selection: FieldSelection): Promise<void>;
  /** Limpa a seleção de um campo, ou tudo se omitido. */
  clear(field?: string): Promise<void>;
  /** Valores possíveis de um campo, para os filtros globais. */
  getFieldValues(field: string, limit?: number): Promise<string[]>;
  /** Notifica mudança de estado de seleção. Devolve o unsubscribe. */
  onInvalidate(cb: () => void): () => void;
}
