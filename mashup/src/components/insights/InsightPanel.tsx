'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { STATUS_BG, STATUS_COLORS } from '@/lib/theme';
import { moeda } from '@/lib/format';
import type { Insight } from '@/types/ppt';

const ESTILO = {
  critico: { cor: STATUS_COLORS.abaixo, fundo: STATUS_BG.abaixo, Icone: ErrorOutlineIcon },
  atencao: { cor: STATUS_COLORS.risco, fundo: STATUS_BG.risco, Icone: WarningAmberIcon },
  positivo: { cor: STATUS_COLORS.meta, fundo: STATUS_BG.meta, Icone: CheckCircleOutlineIcon },
  informativo: { cor: STATUS_COLORS.premiada, fundo: STATUS_BG.premiada, Icone: InfoOutlinedIcon },
} as const;

/**
 * Painel do motor de recomendações.
 *
 * Cada item termina com um botão que leva à tela onde a ação é executada.
 * Insight sem destino é observação — e observação não muda resultado.
 */
export default function InsightPanel({
  insights,
  carregando,
  titulo = 'O que fazer agora',
}: {
  insights: Insight[];
  carregando?: boolean;
  titulo?: string;
}) {
  if (carregando) {
    return (
      <Stack spacing={1.5}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={92} />
        ))}
      </Stack>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Nenhuma recomendação para o contexto selecionado.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" color="text.secondary">
        {titulo}
      </Typography>

      {insights.map((insight) => {
        const { cor, fundo, Icone } = ESTILO[insight.severidade];
        return (
          <Card key={insight.id} sx={{ borderLeft: `4px solid ${cor}` }}>
            <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    bgcolor: fundo,
                    color: cor,
                    borderRadius: 1.5,
                    p: 0.75,
                    display: 'flex',
                    flexShrink: 0,
                  }}
                >
                  <Icone fontSize="small" />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="space-between"
                    alignItems="baseline"
                    flexWrap="wrap"
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {insight.titulo}
                    </Typography>
                    {insight.impactoReais !== undefined && insight.impactoReais > 0 && (
                      <Typography variant="caption" sx={{ fontWeight: 700, color: cor }}>
                        {moeda(insight.impactoReais)}
                      </Typography>
                    )}
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {insight.texto}
                  </Typography>

                  {insight.acaoHref && (
                    <Button
                      component={Link}
                      href={insight.acaoHref}
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ mt: 0.75, ml: -1 }}
                    >
                      {insight.acaoLabel ?? 'Abrir'}
                    </Button>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
