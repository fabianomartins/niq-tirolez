'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { STATUS_COLORS, TIROLEZ } from '@/lib/theme';
import { moedaCurta, percentual } from '@/lib/format';
import type { EvolucaoPonto } from '@/types/ppt';

const SERIES = [
  { chave: 'atingPositivacao' as const, rotulo: 'Positivação', cor: TIROLEZ.verde },
  { chave: 'atingVolume' as const, rotulo: 'Volume', cor: STATUS_COLORS.premiada },
  { chave: 'atingMixHero' as const, rotulo: 'Mix Hero', cor: '#8A6D3B' },
];

const ALTURA = 260;
const LARGURA = 780;
const MARGEM = { top: 16, right: 16, bottom: 30, left: 42 };

/**
 * Evolução mensal dos três KPIs contra a linha de 100%.
 *
 * A faixa 90–100% é sombreada porque é ali que a decisão comercial acontece:
 * dentro dela o distribuidor recebe algo; abaixo dela, nada. Uma linha de meta
 * simples esconde essa descontinuidade.
 */
export default function EvolucaoMensal({ pontos }: { pontos: EvolucaoPonto[] }) {
  if (pontos.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
        Sem histórico no contexto selecionado.
      </Typography>
    );
  }

  const larguraPlot = LARGURA - MARGEM.left - MARGEM.right;
  const alturaPlot = ALTURA - MARGEM.top - MARGEM.bottom;

  const valores = pontos.flatMap((p) => SERIES.map((s) => p[s.chave]));
  const maxY = Math.max(1.15, ...valores) * 1.05;
  const minY = Math.min(0.6, ...valores) * 0.95;

  const x = (i: number) =>
    MARGEM.left + (pontos.length === 1 ? larguraPlot / 2 : (i / (pontos.length - 1)) * larguraPlot);
  const y = (v: number) => MARGEM.top + alturaPlot - ((v - minY) / (maxY - minY)) * alturaPlot;

  const linha = (chave: (typeof SERIES)[number]['chave']) =>
    pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p[chave])}`).join(' ');

  return (
    <Box>
      <Box className="ppt-scroll-x">
        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          width="100%"
          style={{ minWidth: 420 }}
          role="img"
          aria-label="Evolução mensal do atingimento dos KPIs"
        >
          {/* Faixa premiada 90% a 100% */}
          <rect
            x={MARGEM.left}
            y={y(1)}
            width={larguraPlot}
            height={Math.max(0, y(0.9) - y(1))}
            fill={STATUS_COLORS.risco}
            opacity={0.08}
          />

          {[0.7, 0.8, 0.9, 1.0, 1.1].map((v) =>
            v >= minY && v <= maxY ? (
              <g key={v}>
                <line
                  x1={MARGEM.left}
                  x2={LARGURA - MARGEM.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={v === 1 ? TIROLEZ.carvao : '#E2E6EA'}
                  strokeWidth={v === 1 ? 1.5 : 1}
                  strokeDasharray={v === 1 ? undefined : '3 3'}
                />
                <text x={MARGEM.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={TIROLEZ.cinza}>
                  {percentual(v, 0)}
                </text>
              </g>
            ) : null,
          )}

          {pontos.map((p, i) => (
            <text
              key={p.anoMes}
              x={x(i)}
              y={ALTURA - 10}
              textAnchor="middle"
              fontSize={10}
              fill={TIROLEZ.cinza}
            >
              {p.label}
            </text>
          ))}

          {SERIES.map((s) => (
            <g key={s.chave}>
              <path d={linha(s.chave)} fill="none" stroke={s.cor} strokeWidth={2} strokeLinejoin="round" />
              {pontos.map((p, i) => (
                <circle key={p.anoMes} cx={x(i)} cy={y(p[s.chave])} r={3} fill={s.cor}>
                  <title>{`${s.rotulo} · ${p.label}: ${percentual(p[s.chave])}`}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      </Box>

      <Stack direction="row" spacing={2.5} justifyContent="center" flexWrap="wrap" sx={{ mt: 1 }}>
        {SERIES.map((s) => (
          <Stack key={s.chave} direction="row" spacing={0.6} alignItems="center">
            <Box sx={{ width: 14, height: 0, borderTop: `2px solid ${s.cor}` }} />
            <Typography variant="caption" color="text.secondary">
              {s.rotulo}
            </Typography>
          </Stack>
        ))}
        <Typography variant="caption" color="text.secondary">
          · Premiação acumulada no período: {moedaCurta(pontos.reduce((s, p) => s + p.premioTotal, 0))}
        </Typography>
      </Stack>
    </Box>
  );
}
