'use client';

import Chip from '@mui/material/Chip';
import { STATUS_BG, STATUS_COLORS } from '@/lib/theme';
import { corDePrioridade, faixaDeAtingimento, rotuloDeAtingimento } from '@/lib/status';
import { percentual } from '@/lib/format';
import type { StatusRisco } from '@/types/ppt';

export function AtingimentoChip({ ating, mostrarRotulo = false }: { ating: number; mostrarRotulo?: boolean }) {
  const faixa = faixaDeAtingimento(ating);
  return (
    <Chip
      size="small"
      label={mostrarRotulo ? `${percentual(ating)} · ${rotuloDeAtingimento(ating)}` : percentual(ating)}
      sx={{
        bgcolor: STATUS_BG[faixa],
        color: STATUS_COLORS[faixa],
        border: `1px solid ${STATUS_COLORS[faixa]}33`,
      }}
    />
  );
}

export function RiscoChip({ status }: { status: StatusRisco }) {
  const cor =
    status === 'Risco alto'
      ? STATUS_COLORS.abaixo
      : status === 'Atencao'
        ? STATUS_COLORS.risco
        : STATUS_COLORS.meta;
  const fundo =
    status === 'Risco alto' ? STATUS_BG.abaixo : status === 'Atencao' ? STATUS_BG.risco : STATUS_BG.meta;

  return (
    <Chip
      size="small"
      label={status === 'Atencao' ? 'Atenção' : status}
      sx={{ bgcolor: fundo, color: cor, border: `1px solid ${cor}33` }}
    />
  );
}

export function PrioridadeChip({ prioridade }: { prioridade: string }) {
  const cor = corDePrioridade(prioridade);
  const rotulo = prioridade === 'Critico' ? 'Crítico' : prioridade === 'Medio' ? 'Médio' : prioridade;
  return (
    <Chip
      size="small"
      label={rotulo}
      sx={{ bgcolor: `${cor}14`, color: cor, border: `1px solid ${cor}33` }}
    />
  );
}
