'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import BoltIcon from '@mui/icons-material/Bolt';
import { PrioridadeChip } from '@/components/common/StatusChip';
import { STATUS_BG, STATUS_COLORS } from '@/lib/theme';
import { cnpj as fmtCnpj, moeda, toneladas } from '@/lib/format';
import type { HeroMatrixRow, RecomendacaoHero } from '@/types/ppt';

/**
 * Cartão de recomendação da Tela 4.
 *
 * O formato imita o que um supervisor escreveria no caderno antes da visita:
 * o que o PDV já tem, o que falta, o que oferecer e quanto isso vale.
 */
export default function RecomendacaoCard({
  recomendacao,
  situacao,
  categorias,
}: {
  recomendacao: RecomendacaoHero;
  /** Linha da matriz Hero do mesmo PDV — dá o "já comprou / falta". */
  situacao?: HeroMatrixRow;
  categorias: [string, string, string];
}) {
  const r = recomendacao;

  return (
    <Card sx={{ height: '100%', borderLeft: `4px solid ${r.converteSozinho ? STATUS_COLORS.risco : STATUS_COLORS.neutro}` }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {r.pdv}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {fmtCnpj(r.cnpj)} · {r.canal}
            </Typography>
          </Box>
          <PrioridadeChip prioridade={r.prioridade} />
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Situação atual: o que já tem e o que falta */}
        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          {categorias.map((cat, i) => {
            const tem = situacao ? situacao.categorias[i] === 'comprou' : i + 1 !== r.categoriaNum;
            return (
              <Stack key={cat} direction="row" spacing={0.75} alignItems="center">
                {tem ? (
                  <CheckIcon sx={{ fontSize: 16, color: STATUS_COLORS.meta }} />
                ) : (
                  <CloseIcon sx={{ fontSize: 16, color: STATUS_COLORS.abaixo }} />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: tem ? 'text.primary' : STATUS_COLORS.abaixo,
                    fontWeight: tem ? 400 : 700,
                    textDecoration: 'none',
                  }}
                >
                  {cat.replace(/^Cat \d+ - /, '')}
                </Typography>
              </Stack>
            );
          })}
        </Stack>

        {/* Recomendação */}
        <Box sx={{ bgcolor: STATUS_BG.premiada, borderRadius: 1.5, p: 1.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: STATUS_COLORS.premiada }}>
            RECOMENDAÇÃO
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>
            {r.skuDescricao}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {r.skuRecomendado} · {r.motivo}
          </Typography>
        </Box>

        {/* Impacto */}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          {r.converteSozinho ? (
            <Chip
              size="small"
              icon={<BoltIcon />}
              label="Vira Hero com esta venda"
              sx={{ bgcolor: STATUS_BG.risco, color: STATUS_COLORS.risco, fontWeight: 700 }}
            />
          ) : (
            <Chip
              size="small"
              variant="outlined"
              label={`Faltam ${r.categoriasFaltantesQtd} categorias`}
            />
          )}
          <Chip size="small" variant="outlined" label={`~ ${toneladas(r.volumeEstimadoTon)}`} />
          {r.valorPorConversao > 0 && (
            <Chip
              size="small"
              label={`+ ${moeda(r.valorPorConversao)} na premiação`}
              sx={{ bgcolor: STATUS_BG.meta, color: STATUS_COLORS.meta, fontWeight: 700 }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
