'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { STATUS_COLORS, TIROLEZ } from '@/lib/theme';
import { percentual } from '@/lib/format';
import type { PptSummary } from '@/types/ppt';

const TAMANHO = 268;
const CENTRO = TAMANHO / 2;
const RAIO = 82;
/** Escala do radar: 0 a 120% de atingimento. */
const MAX = 1.2;

const EIXOS = [
  { id: 'positivacao' as const, rotulo: 'Positivação' },
  { id: 'volume' as const, rotulo: 'Volume' },
  { id: 'mixHero' as const, rotulo: 'Mix Hero' },
];

function anguloDoEixo(indice: number) {
  return (-90 + indice * (360 / EIXOS.length)) * (Math.PI / 180);
}

/** Posição de um valor de atingimento sobre o eixo (saturado em MAX). */
function ponto(indice: number, valor: number) {
  const angulo = anguloDoEixo(indice);
  const r = (Math.max(0, Math.min(MAX, valor)) / MAX) * RAIO;
  return { x: CENTRO + r * Math.cos(angulo), y: CENTRO + r * Math.sin(angulo) };
}

/**
 * Posição em raio absoluto, SEM saturar. É o que coloca o rótulo fora do anel:
 * `ponto()` satura em MAX, então usá-lo para rótulo os empilharia em cima da
 * borda do polígono.
 */
function pontoRaio(indice: number, raio: number) {
  const angulo = anguloDoEixo(indice);
  return { x: CENTRO + raio * Math.cos(angulo), y: CENTRO + raio * Math.sin(angulo) };
}

function poligono(valores: number[]) {
  return valores.map((v, i) => {
    const p = ponto(i, v);
    return `${p.x},${p.y}`;
  }).join(' ');
}

/**
 * Radar dos três KPIs, com a linha de 100% desenhada em destaque.
 *
 * O anel de referência não é a borda externa: é a linha de 100%. Assim o
 * usuário vê imediatamente se está DENTRO ou FORA da meta em cada eixo, em vez
 * de comparar áreas — que é uma leitura que ninguém faz corretamente.
 */
export default function RadarKpis({ resumo }: { resumo: PptSummary }) {
  const valores = EIXOS.map((e) => resumo.kpis[e.id].ating);
  const projetados = EIXOS.map((e) => resumo.kpis[e.id].atingProjetado);

  const aneis = [0.5, 0.9, 1.0];

  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
        role="img"
        aria-label="Radar dos três KPIs do PPT"
        style={{ maxWidth: TAMANHO }}
      >
        {aneis.map((a) => (
          <polygon
            key={a}
            points={poligono(EIXOS.map(() => a))}
            fill="none"
            stroke={a === 1 ? TIROLEZ.carvao : '#DDE2E7'}
            strokeWidth={a === 1 ? 1.5 : 1}
            strokeDasharray={a === 1 ? undefined : '3 3'}
          />
        ))}

        {EIXOS.map((eixo, i) => {
          const p = ponto(i, MAX);
          const rotulo = pontoRaio(i, RAIO + 26);
          return (
            <g key={eixo.id}>
              <line x1={CENTRO} y1={CENTRO} x2={p.x} y2={p.y} stroke="#DDE2E7" strokeWidth={1} />
              <text
                x={rotulo.x}
                y={rotulo.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={600}
                fill={TIROLEZ.cinza}
              >
                {eixo.rotulo}
              </text>
              <text
                x={rotulo.x}
                y={rotulo.y + 13}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={700}
                fill={valores[i]! >= 1 ? STATUS_COLORS.meta : valores[i]! >= 0.9 ? STATUS_COLORS.risco : STATUS_COLORS.abaixo}
              >
                {percentual(valores[i] ?? 0, 0)}
              </text>
            </g>
          );
        })}

        {/* Projeção de fechamento */}
        <polygon
          points={poligono(projetados)}
          fill="none"
          stroke={TIROLEZ.cinza}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* Realizado */}
        <polygon
          points={poligono(valores)}
          fill={`${TIROLEZ.verde}30`}
          stroke={TIROLEZ.verde}
          strokeWidth={2}
        />
        {valores.map((v, i) => {
          const p = ponto(i, v);
          return <circle key={EIXOS[i]!.id} cx={p.x} cy={p.y} r={3.5} fill={TIROLEZ.verde} />;
        })}
      </svg>

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 0.5 }}>
        <Legenda cor={TIROLEZ.verde} rotulo="Realizado" />
        <Legenda cor={TIROLEZ.cinza} rotulo="Projeção" tracejado />
        <Legenda cor={TIROLEZ.carvao} rotulo="Meta (100%)" />
      </Stack>
    </Box>
  );
}

function Legenda({ cor, rotulo, tracejado }: { cor: string; rotulo: string; tracejado?: boolean }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box
        sx={{
          width: 14,
          height: 0,
          borderTop: `2px ${tracejado ? 'dashed' : 'solid'} ${cor}`,
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {rotulo}
      </Typography>
    </Stack>
  );
}
