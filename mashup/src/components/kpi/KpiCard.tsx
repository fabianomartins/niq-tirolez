'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { corDeAtingimento, rotuloDeAtingimento } from '@/lib/status';
import { decimal, inteiro, moeda, percentual, pluralizar, toneladas } from '@/lib/format';
import type { KpiState } from '@/types/ppt';

function valorFormatado(v: number, unidade: KpiState['unidade']): string {
  return unidade === 'ton' ? toneladas(v) : inteiro(v);
}

/**
 * Card de KPI do PPT.
 *
 * O card não para em "94,3%". Ele fecha a frase: quanto falta, em qual unidade,
 * e quanto isso vale em reais. Um KPI que só informa percentual transfere para
 * o usuário o trabalho de descobrir o que fazer — e ninguém faz essa conta.
 */
export default function KpiCard({
  kpi,
  consolidado = false,
  destaque = false,
}: {
  kpi: KpiState;
  /** True quando o card agrega vários distribuidores (ver PptSummary.consolidado). */
  consolidado?: boolean;
  destaque?: boolean;
}) {
  const cor = corDeAtingimento(kpi.ating);
  const progresso = Math.min(100, Math.max(0, kpi.ating * 100));
  const tendenciaPositiva = kpi.atingProjetado >= kpi.ating;

  const quantidadeFaltante =
    kpi.unidade === 'ton'
      ? toneladas(kpi.gapProxDegrau)
      : pluralizar(kpi.gapProxDegrau, 'PDV', 'PDVs');

  // Nada a perseguir: sem gap E sem ganho disponível em nenhum distribuidor.
  const noTopo = kpi.gapProxDegrau <= 0 && kpi.ganhoProxDegrau <= 0;

  const frase = noTopo
    ? `Meta batida. Prêmio garantido de ${moeda(kpi.premio)}.`
    : consolidado
      ? // Em carteira cada distribuidor tem o próprio degrau: some o esforço,
        // nunca anuncie um percentual único que não existe para ninguém.
        `Faltam ${quantidadeFaltante} somados para o próximo degrau de cada distribuidor — vale ${moeda(kpi.ganhoProxDegrau)}`
      : `Faltam ${quantidadeFaltante} para ${percentual(kpi.proxDegrau, 0)} da meta — vale ${moeda(kpi.ganhoProxDegrau)}`;

  return (
    <Card
      className="ppt-kpi-card"
      sx={{
        height: '100%',
        ...(destaque ? { borderColor: cor } : {}),
        '--ppt-status-color': cor,
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="subtitle2" color="text.secondary">
            {kpi.label}
          </Typography>
          <Tooltip
            title={
              kpi.atingProjetado > 0
                ? `Projeção de fechamento: ${percentual(kpi.atingProjetado)} pelo ritmo de dias úteis`
                : 'Sem projeção disponível'
            }
          >
            <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color: tendenciaPositiva ? 'success.main' : 'error.main' }}>
              {tendenciaPositiva ? (
                <ArrowUpwardIcon sx={{ fontSize: 14 }} />
              ) : (
                <ArrowDownwardIcon sx={{ fontSize: 14 }} />
              )}
              <Typography variant="caption" fontWeight={700}>
                {percentual(kpi.atingProjetado, 0)}
              </Typography>
            </Stack>
          </Tooltip>
        </Stack>

        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: cor, lineHeight: 1.1 }}>
            {percentual(kpi.ating)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {rotuloDeAtingimento(kpi.ating)}
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {valorFormatado(kpi.real, kpi.unidade)} de {valorFormatado(kpi.meta, kpi.unidade)}
        </Typography>

        <Box sx={{ position: 'relative', mt: 1.5, mb: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={progresso}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: cor, borderRadius: 4 },
            }}
          />
          {/* Marcas dos degraus: o usuário enxerga onde estão 90 / 95 / 100. */}
          {[0.9, 0.95].map((d) => (
            <Box
              key={d}
              sx={{
                position: 'absolute',
                left: `${d * 100}%`,
                top: -2,
                height: 12,
                width: 2,
                bgcolor: 'background.paper',
                opacity: 0.9,
              }}
            />
          ))}
        </Box>

        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: noTopo ? 'success.main' : 'text.primary' }}
        >
          {frase}
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
          Peso {decimal(kpi.peso * 100, 2)}% do sell-in · prêmio atual {moeda(kpi.premio)}
        </Typography>
      </CardContent>
    </Card>
  );
}
