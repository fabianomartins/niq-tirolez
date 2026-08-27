'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { STATUS_COLORS } from '@/lib/theme';
import { corDeRisco } from '@/lib/status';
import { moeda, percentual } from '@/lib/format';
import type { DistribuidorRow } from '@/types/ppt';

/**
 * Mapa regional dos distribuidores.
 *
 * Projeção equirretangular simples sobre o retângulo do Brasil. Não é um mapa
 * cartográfico — é um mapa de POSIÇÃO RELATIVA, que é o que o executivo precisa:
 * "meu problema está concentrado no Nordeste ou espalhado?".
 *
 * Para geometria de UF/município reais, a Fase 2 troca este componente pelo
 * `sn-map` do Nebula com a camada oficial (ver docs/06-roadmap.md).
 */

const LIMITES = { latMin: -34, latMax: 6, lonMin: -74, lonMax: -34 };
const LARGURA = 460;
const ALTURA = 470;

function projetar(lat: number, lon: number) {
  const x = ((lon - LIMITES.lonMin) / (LIMITES.lonMax - LIMITES.lonMin)) * LARGURA;
  const y = ((LIMITES.latMax - lat) / (LIMITES.latMax - LIMITES.latMin)) * ALTURA;
  return { x, y };
}

export default function MapaRegional({ linhas }: { linhas: DistribuidorRow[] }) {
  const validas = linhas.filter(
    (l) => typeof l.latitude === 'number' && typeof l.longitude === 'number' && l.latitude !== 0,
  );

  const maxPremio = Math.max(1, ...validas.map((l) => l.premioPotencial));

  if (validas.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
        Sem coordenadas de PDV no contexto selecionado.
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'grid', placeItems: 'center' }}>
        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          width="100%"
          style={{ maxWidth: LARGURA }}
          role="img"
          aria-label="Distribuição regional dos distribuidores por status de risco"
        >
          {/* Grade de referência de latitude/longitude */}
          {[-30, -20, -10, 0].map((lat) => {
            const { y } = projetar(lat, 0);
            return (
              <line key={lat} x1={0} x2={LARGURA} y1={y} y2={y} stroke="#E8ECEF" strokeWidth={1} />
            );
          })}
          {[-70, -60, -50, -40].map((lon) => {
            const { x } = projetar(0, lon);
            return (
              <line key={lon} x1={x} x2={x} y1={0} y2={ALTURA} stroke="#E8ECEF" strokeWidth={1} />
            );
          })}

          {validas
            .slice()
            .sort((a, b) => b.premioPotencial - a.premioPotencial)
            .map((l) => {
              const { x, y } = projetar(l.latitude!, l.longitude!);
              const raio = 7 + (l.premioPotencial / maxPremio) * 16;
              const cor = corDeRisco(l.statusRisco);
              return (
                <g key={`${l.distribuidorId}-${l.regiao}`}>
                  <circle cx={x} cy={y} r={raio} fill={cor} opacity={0.22} />
                  <circle cx={x} cy={y} r={raio * 0.45} fill={cor}>
                    <title>
                      {`${l.distribuidor} · ${l.regiao}\n` +
                        `Volume: ${percentual(l.atingVolume)}\n` +
                        `Premiação: ${moeda(l.premioTotal)} de ${moeda(l.premioPotencial)}\n` +
                        `Ganho no próximo degrau: ${moeda(l.ganhoProxDegrau)}`}
                    </title>
                  </circle>
                </g>
              );
            })}
        </svg>
      </Box>

      <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ mt: 1 }}>
        <Legenda cor={STATUS_COLORS.meta} rotulo="No alvo" />
        <Legenda cor={STATUS_COLORS.risco} rotulo="Atenção" />
        <Legenda cor={STATUS_COLORS.abaixo} rotulo="Risco alto" />
        <Typography variant="caption" color="text.secondary">
          · tamanho = premiação potencial
        </Typography>
      </Stack>
    </Box>
  );
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <Stack direction="row" spacing={0.6} alignItems="center">
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cor }} />
      <Typography variant="caption" color="text.secondary">
        {rotulo}
      </Typography>
    </Stack>
  );
}
