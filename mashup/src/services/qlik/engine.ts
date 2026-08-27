'use client';

/**
 * Provider Engine API — a conexão real com o Qlik Sense Cloud.
 *
 * Decisões:
 *  - UM WebSocket por app, compartilhado por toda a aplicação (singleton).
 *    Abrir socket por componente estoura o limite de sessões do tenant.
 *  - Objetos de sessão são cacheados por id de cubo. Recriar o objeto a cada
 *    render força o Engine a recalcular a hipercubo do zero.
 *  - Autenticação por cookie (web integration id). Nenhum token no bundle.
 */

import enigma from 'enigma.js';
import schema from 'enigma.js/schemas/12.2015.0.json';
import type {
  FieldSelection,
  HyperCubeDef,
  QlikCell,
  QlikDataProvider,
  QlikLayout,
} from '@/types/qlik';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface QlikConnectionConfig {
  tenant: string;
  appId: string;
  webIntegrationId?: string;
}

let sessionPromise: Promise<any> | null = null;

function buildUrl({ tenant, appId, webIntegrationId }: QlikConnectionConfig): string {
  const base = `wss://${tenant}/app/${appId}`;
  return webIntegrationId ? `${base}?qlik-web-integration-id=${webIntegrationId}` : base;
}

export async function openQlikApp(config: QlikConnectionConfig): Promise<any> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const session = enigma.create({
        schema,
        url: buildUrl(config),
        // O cookie de sessão do tenant é enviado pelo browser; não há segredo
        // no cliente. Se o usuário não estiver autenticado, o socket fecha com
        // 401 e o AppShell redireciona para /api/auth/login.
        createSocket: (url: string) => new WebSocket(url),
        suspendOnClose: true,
      });

      session.on('suspended', () => {
        // Reabre na próxima chamada em vez de deixar a tela em branco.
        sessionPromise = null;
      });

      const global = (await session.open()) as any;
      return global.openDoc(config.appId);
    })();
  }
  return sessionPromise;
}

/** Converte a definição declarativa no formato que o Engine espera. */
function toEngineDef(def: HyperCubeDef) {
  return {
    qDimensions: def.qDimensions,
    qMeasures: def.qMeasures,
    qInitialDataFetch: def.qInitialDataFetch,
    qSuppressZero: def.qSuppressZero ?? false,
    qSuppressMissing: def.qSuppressMissing ?? true,
    qInterColumnSortOrder: def.qInterColumnSortOrder,
    qMode: def.qMode ?? 'S',
    qAlwaysFullyExpanded: true,
  };
}

export class EngineProvider implements QlikDataProvider {
  readonly mode = 'engine' as const;

  private readonly objects = new Map<string, any>();

  private readonly listeners = new Set<() => void>();

  /** Exposto para o nebula.js, que precisa do handle bruto do app. */
  constructor(public readonly app: any) {
    // 'changed' dispara a cada mudança de estado de seleção do documento.
    this.app.on('changed', () => {
      this.listeners.forEach((cb) => cb());
    });
  }

  private async getObject(def: HyperCubeDef) {
    const cached = this.objects.get(def.id);
    if (cached) return cached;
    const obj = await this.app.createSessionObject({
      qInfo: { qId: `ppt-${def.id}`, qType: 'ppt-cube' },
      qHyperCubeDef: toEngineDef(def),
    });
    this.objects.set(def.id, obj);
    return obj;
  }

  async getHyperCubeData(def: HyperCubeDef): Promise<QlikCell[][]> {
    const obj = await this.getObject(def);
    const layout: QlikLayout = await obj.getLayout();
    const cube = layout.qHyperCube;
    const rows: QlikCell[][] = [...(cube.qDataPages[0]?.qMatrix ?? [])];

    const fetchDef = def.qInitialDataFetch[0];
    if (!fetchDef) return rows;

    // Paginação: o Engine devolve no máximo 10.000 células por página. Cubos
    // de PDV passam disso com facilidade, então buscamos o resto em blocos.
    const width = fetchDef.qWidth;
    const pageHeight = fetchDef.qHeight;
    let top = rows.length;
    while (top < cube.qSize.qcy && rows.length < 5000) {
      const pages = await obj.getHyperCubeData('/qHyperCubeDef', [
        { qTop: top, qLeft: 0, qHeight: pageHeight, qWidth: width },
      ]);
      const matrix: QlikCell[][] = pages?.[0]?.qMatrix ?? [];
      if (matrix.length === 0) break;
      rows.push(...matrix);
      top += matrix.length;
    }

    return rows;
  }

  async select({ field, values }: FieldSelection): Promise<void> {
    const handle = await this.app.getField(field);
    if (values.length === 0) {
      await handle.clear();
      return;
    }
    await handle.selectValues(
      values.map((v) =>
        typeof v === 'number'
          ? { qNumber: v, qIsNumeric: true }
          : { qText: String(v), qIsNumeric: false },
      ),
      false,
      false,
    );
  }

  async clear(field?: string): Promise<void> {
    if (field) {
      const handle = await this.app.getField(field);
      await handle.clear();
      return;
    }
    await this.app.clearAll();
  }

  async getFieldValues(field: string, limit = 200): Promise<string[]> {
    const obj = await this.app.createSessionObject({
      qInfo: { qType: 'ppt-listbox' },
      qListObjectDef: {
        qDef: { qFieldDefs: [field] },
        qInitialDataFetch: [{ qTop: 0, qLeft: 0, qHeight: limit, qWidth: 1 }],
      },
    });
    const layout = await obj.getLayout();
    const matrix = layout.qListObject?.qDataPages?.[0]?.qMatrix ?? [];
    await this.app.destroySessionObject(layout.qInfo.qId);
    return matrix
      .map((r: QlikCell[]) => r[0]?.qText ?? '')
      .filter((v: string) => v.length > 0);
  }

  onInvalidate(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}
