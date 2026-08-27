'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { STATUS_COLORS } from '@/lib/theme';
import { moeda, percentual } from '@/lib/format';
import type { PptSummary } from '@/types/ppt';

/**
 * Card de premiação. Mostra três números que contam a história inteira:
 * o que já está garantido, o que a projeção indica e o teto do programa.
 * A barra empilhada torna o "dinheiro na mesa" impossível de ignorar.
 */
export default function PremiacaoCard({ resumo }: { resumo: PptSummary }) {
  const captura = resumo.premioPotencial > 0 ? resumo.premioTotal / resumo.premioPotencial : 0;
  const capturaProjetada =
    resumo.premioPotencial > 0 ? resumo.premioProjetado / resumo.premioPotencial : 0;

  const pctGarantido = Math.min(100, captura * 100);
  const pctProjetadoExtra = Math.max(0, Math.min(100, capturaProjetada * 100) - pctGarantido);

  return (
    <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'common.white', borderColor: 'primary.dark' }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>
          Premiação estimada
        </Typography>

        <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15, mt: 0.5 }}>
          {moeda(resumo.premioTotal)}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          de {moeda(resumo.premioPotencial)} possíveis · {percentual(captura, 0)} do teto
        </Typography>

        <Box
          sx={{
            display: 'flex',
            height: 10,
            borderRadius: 5,
            overflow: 'hidden',
            bgcolor: 'rgba(255,255,255,0.22)',
            mt: 2,
            mb: 1.5,
          }}
        >
          <Box sx={{ width: `${pctGarantido}%`, bgcolor: 'common.white' }} />
          <Box
            sx={{
              width: `${pctProjetadoExtra}%`,
              bgcolor: 'rgba(255,255,255,0.55)',
            }}
          />
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
          <Legenda cor="#FFFFFF" rotulo="Garantido hoje" valor={moeda(resumo.premioTotal)} />
          <Legenda
            cor="rgba(255,255,255,0.55)"
            rotulo="Projeção do mês"
            valor={moeda(resumo.premioProjetado)}
          />
        </Stack>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.25)', my: 1.5 }} />

        <Stack spacing={0.75}>
          <Linha
            rotulo="Dinheiro na mesa"
            valor={moeda(resumo.premioNaoCapturado)}
            destaque={resumo.premioNaoCapturado > 0 ? STATUS_COLORS.risco : undefined}
          />
          <Linha
            rotulo="Ganho ao cruzar os próximos degraus"
            valor={moeda(resumo.ganhoProxDegrauTotal)}
          />
          <Linha rotulo="Base de sell-in do mês" valor={moeda(resumo.sellIn)} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function Legenda({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: cor, flexShrink: 0 }} />
      <Box>
        <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', lineHeight: 1.2 }}>
          {rotulo}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {valor}
        </Typography>
      </Box>
    </Stack>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="caption" sx={{ opacity: 0.85 }}>
        {rotulo}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 700, color: destaque ?? 'inherit' }}>
        {valor}
      </Typography>
    </Stack>
  );
}
