'use client';

/**
 * Ponte React <-> nebula.js (stardust).
 *
 * Usada quando a interação desejada é ANÁLISE: hover nativo, seleção por
 * arrasto, drill de dimensão hierárquica. Para interação de EXECUÇÃO
 * (recomendar SKU, marcar visita) usamos componentes React próprios — nenhum
 * objeto Qlik nativo entrega essa semântica.
 *
 * Detalhes que costumam morder:
 *  - `embed()` é criado UMA vez por app. Recriar a cada render vaza o
 *    contexto do stardust e multiplica os listeners do Engine.
 *  - `render()` devolve um `unmount`. Sem chamá-lo no cleanup, o objeto de
 *    sessão fica pendurado no Engine até o socket cair.
 *  - Em modo mock não há Engine: renderizamos o fallback React.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { embed } from '@nebula.js/stardust';
import lineChart from '@nebula.js/sn-line-chart';
import barChart from '@nebula.js/sn-bar-chart';
import { EngineProvider } from '@/services/qlik/engine';
import { useQlik } from '@/hooks/useQlik';
import { TIROLEZ } from '@/lib/theme';
import type { HyperCubeDef } from '@/types/qlik';

/* eslint-disable @typescript-eslint/no-explicit-any */

const PALETA_TIROLEZ = {
  name: 'Tirolez',
  propertyValue: 'tirolez',
  scales: [
    {
      name: 'PPT',
      colors: [[TIROLEZ.verde, '#0F6FB5', '#E8A317', '#C0392B', TIROLEZ.cinza]],
    },
  ],
  palettes: {
    data: [{ name: 'PPT', type: 'pyramid', colors: [[TIROLEZ.verde], [TIROLEZ.verde, '#0F6FB5'], [TIROLEZ.verde, '#0F6FB5', '#E8A317']] }],
    ui: [{ name: 'PPT UI', colors: [TIROLEZ.verde, '#0F6FB5', '#E8A317', '#C0392B'] }],
  },
};

type EmbedApi = ReturnType<typeof embed>;

let embedCache: EmbedApi | null = null;

function obterEmbed(app: any): EmbedApi {
  if (!embedCache) {
    embedCache = embed(app, {
      // Fallback obrigatório do stardust: se algum objeto pedir um tipo que não
      // registramos, falha alto em vez de renderizar um retângulo vazio.
      load: async ($: { name: string }) => {
        throw new Error(`Tipo de visualização não registrado no mashup: ${$.name}`);
      },
      context: { theme: 'ppt', language: 'pt-BR', constraints: {} },
      types: [
        { name: 'linechart', load: async () => lineChart as never },
        { name: 'barchart', load: async () => barChart as never },
      ],
      themes: [
        {
          id: 'ppt',
          load: async () => ({
            color: TIROLEZ.carvao,
            fontFamily: 'var(--font-ui), sans-serif',
            backgroundColor: 'transparent',
            dataColors: { primaryColor: TIROLEZ.verde, othersColor: TIROLEZ.cinza },
            palettes: PALETA_TIROLEZ.palettes,
            scales: PALETA_TIROLEZ.scales,
          }),
        },
      ],
    });
  }
  return embedCache;
}

export interface NebulaChartProps {
  tipo: 'linechart' | 'barchart';
  def: HyperCubeDef;
  /** Propriedades específicas do gráfico (eixos, legenda, rótulos). */
  opcoes?: Record<string, unknown>;
  altura?: number;
  /** Renderizado quando não há Engine (modo mock) ou enquanto o objeto sobe. */
  fallback?: React.ReactNode;
}

export default function NebulaChart({
  tipo,
  def,
  opcoes,
  altura = 280,
  fallback,
}: NebulaChartProps) {
  const { provider } = useQlik();
  const ref = useRef<HTMLDivElement | null>(null);
  const [pronto, setPronto] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const engineApp = useMemo(
    () => (provider instanceof EngineProvider ? provider.app : null),
    [provider],
  );

  useEffect(() => {
    if (!engineApp || !ref.current) return undefined;

    let ativo = true;
    let desmontar: (() => void) | undefined;

    (async () => {
      try {
        const nebula = obterEmbed(engineApp);
        const objeto = await nebula.render({
          element: ref.current as HTMLElement,
          type: tipo,
          properties: {
            qInfo: { qType: tipo },
            qHyperCubeDef: {
              qDimensions: def.qDimensions,
              qMeasures: def.qMeasures,
              qInitialDataFetch: def.qInitialDataFetch,
              qSuppressZero: def.qSuppressZero ?? false,
              qSuppressMissing: true,
              qInterColumnSortOrder: def.qInterColumnSortOrder,
            },
            ...opcoes,
          },
        });
        if (!ativo) {
          (objeto as unknown as { close?: () => void }).close?.();
          return;
        }
        desmontar = () => (objeto as unknown as { close?: () => void }).close?.();
        setPronto(true);
      } catch {
        if (ativo) setFalhou(true);
      }
    })();

    return () => {
      ativo = false;
      desmontar?.();
    };
    // `def` é um objeto estável exportado de definitions.ts — não recriado por render.
  }, [engineApp, tipo, def, opcoes]);

  if (!engineApp || falhou) {
    return <>{fallback ?? <Skeleton variant="rounded" height={altura} />}</>;
  }

  return (
    <Box sx={{ position: 'relative', height: altura, width: '100%' }}>
      <Box ref={ref} sx={{ position: 'absolute', inset: 0 }} />
      {!pronto && (
        <Skeleton variant="rounded" height={altura} sx={{ position: 'absolute', inset: 0 }} />
      )}
    </Box>
  );
}
