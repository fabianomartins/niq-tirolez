'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { STATUS_COLORS } from '@/lib/theme';
import { corDeAtingimento } from '@/lib/status';
import { percentual } from '@/lib/format';

const RAIO = 78;
const ESPESSURA = 14;
const ANGULO_INICIAL = -220;
const ANGULO_FINAL = 40;
/** O gauge vai de 0% a 120% — acima disso a agulha satura. */
const MAX = 1.2;

function polar(cx: number, cy: number, r: number, grau: number) {
  const rad = (grau * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arco(cx: number, cy: number, r: number, de: number, ate: number) {
  const inicio = polar(cx, cy, r, de);
  const fim = polar(cx, cy, r, ate);
  const grande = Math.abs(ate - de) > 180 ? 1 : 0;
  return `M ${inicio.x} ${inicio.y} A ${r} ${r} 0 ${grande} 1 ${fim.x} ${fim.y}`;
}

function anguloDe(valor: number) {
  const p = Math.max(0, Math.min(MAX, valor)) / MAX;
  return ANGULO_INICIAL + p * (ANGULO_FINAL - ANGULO_INICIAL);
}

/**
 * Gauge de meta com os degraus do programa desenhados no próprio arco.
 *
 * Um gauge liso mostra "onde estou". Este mostra "onde estou em relação ao
 * degrau que paga" — que é a informação que muda o comportamento comercial.
 */
export default function GaugeMeta({
  ating,
  atingProjetado,
  titulo,
  legenda,
}: {
  ating: number;
  atingProjetado?: number;
  titulo: string;
  legenda?: string;
}) {
  // 240 de largura para o rótulo de 100% (quase horizontal à direita)
  // caber inteiro dentro do viewBox.
  const largura = 240;
  const altura = 152;
  const cx = largura / 2;
  const cy = altura - 32;
  const cor = corDeAtingimento(ating);

  const faixas: Array<[number, number, string]> = [
    [0, 0.9, STATUS_COLORS.abaixo],
    [0.9, 0.95, STATUS_COLORS.risco],
    [0.95, 1, STATUS_COLORS.premiada],
    [1, MAX, STATUS_COLORS.meta],
  ];

  const anguloAgulha = anguloDe(ating);
  const ponta = polar(cx, cy, RAIO - ESPESSURA - 6, anguloAgulha);

  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${largura} ${altura}`}
        role="img"
        aria-label={`${titulo}: ${percentual(ating)} da meta`}
        style={{ maxWidth: largura }}
      >
        {faixas.map(([de, ate, corFaixa]) => (
          <path
            key={`${de}-${ate}`}
            d={arco(cx, cy, RAIO, anguloDe(de), anguloDe(ate))}
            stroke={corFaixa}
            strokeWidth={ESPESSURA}
            fill="none"
            opacity={0.22}
            strokeLinecap="butt"
          />
        ))}

        {/* Trilha percorrida */}
        <path
          d={arco(cx, cy, RAIO, ANGULO_INICIAL, anguloAgulha)}
          stroke={cor}
          strokeWidth={ESPESSURA}
          fill="none"
          strokeLinecap="round"
        />

        {/* Marcas dos degraus */}
        {[0.9, 0.95, 1].map((d) => {
          const a = anguloDe(d);
          const p1 = polar(cx, cy, RAIO - ESPESSURA / 2 - 1, a);
          const p2 = polar(cx, cy, RAIO + ESPESSURA / 2 + 1, a);
          const rotulo = polar(cx, cy, RAIO + ESPESSURA + 10, a);
          return (
            <g key={d}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#FFFFFF" strokeWidth={2} />
              <text
                x={rotulo.x}
                y={rotulo.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fill="#5C6874"
                fontWeight={600}
              >
                {Math.round(d * 100)}
              </text>
            </g>
          );
        })}

        {/* Projeção: onde o mês fecha se o ritmo continuar */}
        {atingProjetado !== undefined && atingProjetado > 0 && (
          <g>
            {(() => {
              const a = anguloDe(atingProjetado);
              const p1 = polar(cx, cy, RAIO - ESPESSURA / 2 - 4, a);
              const p2 = polar(cx, cy, RAIO + ESPESSURA / 2 + 4, a);
              return (
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#1F2933"
                  strokeWidth={2}
                  strokeDasharray="3 2"
                />
              );
            })()}
          </g>
        )}

        <line x1={cx} y1={cy} x2={ponta.x} y2={ponta.y} stroke="#1F2933" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="#1F2933" />

        <text x={cx} y={cy - 22} textAnchor="middle" fontSize={26} fontWeight={700} fill={cor}>
          {percentual(ating, 0)}
        </text>
      </svg>

      <Typography variant="subtitle2" color="text.secondary">
        {titulo}
      </Typography>
      {legenda && (
        <Typography variant="caption" color="text.secondary" display="block">
          {legenda}
        </Typography>
      )}
    </Box>
  );
}
