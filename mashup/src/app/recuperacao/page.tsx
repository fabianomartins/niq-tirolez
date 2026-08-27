'use client';

import { useMemo } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageHeader from '@/components/common/PageHeader';
import { TabelaRecuperacao } from '@/components/tables/OportunidadeTable';
import { useOportunidadesRecuperacao, usePptResumo } from '@/hooks/usePpt';
import { STATUS_COLORS } from '@/lib/theme';
import { inteiro, moeda, percentual, toneladas } from '@/lib/format';

export default function RecuperacaoPage() {
  const { dados: linhas, carregando } = useOportunidadesRecuperacao();
  const { resumo } = usePptResumo();

  const numeros = useMemo(() => {
    const quedaTotal = linhas.reduce((s, o) => s + o.quedaTon, 0);
    const criticos = linhas.filter((o) => o.prioridade === 'Critico').length;
    const valor = linhas.reduce((s, o) => s + o.valorPotencial, 0);
    return { quedaTotal, criticos, valor };
  }, [linhas]);

  const kpi = resumo?.kpis.volume;
  const gap = kpi?.gapProxDegrau ?? 0;
  const cobertura = gap > 0 ? Math.min(1, numeros.quedaTotal / gap) : 1;

  return (
    <>
      <PageHeader
        titulo="Potencial de Recuperação"
        pergunta="Quem comprou menos que a própria média — e quanto isso custa na meta de volume?"
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Quanto a queda destes clientes cobre do gap de volume
              </Typography>

              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: '2.2rem',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: cobertura >= 1 ? STATUS_COLORS.meta : STATUS_COLORS.risco,
                  }}
                >
                  {percentual(cobertura, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  do gap para o próximo degrau
                </Typography>
              </Stack>

              <LinearProgress
                variant="determinate"
                value={Math.min(100, cobertura * 100)}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  my: 1.5,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: cobertura >= 1 ? STATUS_COLORS.meta : STATUS_COLORS.risco,
                    borderRadius: 5,
                  },
                }}
              />

              <Typography variant="body2" color="text.secondary">
                {gap > 0 ? (
                  <>
                    Faltam <strong>{toneladas(gap)}</strong> para o próximo degrau de volume. Estes{' '}
                    <strong>{inteiro(linhas.length)} PDVs</strong> deixaram de comprar{' '}
                    <strong>{toneladas(numeros.quedaTotal)}</strong> em relação à própria média dos 3
                    meses anteriores.{' '}
                    {cobertura >= 1
                      ? 'Trazê-los de volta ao patamar histórico já resolve o gap inteiro.'
                      : 'Recuperá-los ajuda, mas não fecha sozinho — combine com a fila de positivação.'}
                  </>
                ) : (
                  <>
                    A meta de volume já foi atingida. Recuperar estes clientes protege o resultado do
                    próximo mês, quando a meta sobe.
                  </>
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <Card>
              <CardContent sx={{ py: 1.75 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Clientes em queda
                </Typography>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>
                  {inteiro(linhas.length)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {inteiro(numeros.criticos)} em prioridade crítica · corte de 20% abaixo da média
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ py: 1.75 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Premiação recuperável
                </Typography>
                <Typography
                  sx={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2, color: STATUS_COLORS.meta }}
                >
                  {moeda(numeros.valor)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  parcela do degrau de volume coberta por estes clientes
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Stack sx={{ mt: 3 }} spacing={1}>
        <Typography variant="h3">Ranking de recuperação</Typography>
        <Typography variant="body2" color="text.secondary">
          Score = 60% do tamanho absoluto da queda (o que move o KPI) + 40% da severidade relativa
          (o que indica cliente em fuga). O primeiro puxa volume; o segundo evita perder o cliente.
        </Typography>
        <TabelaRecuperacao linhas={linhas} carregando={carregando} />
      </Stack>
    </>
  );
}
