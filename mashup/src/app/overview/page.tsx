'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageHeader from '@/components/common/PageHeader';
import KpiCard from '@/components/kpi/KpiCard';
import PremiacaoCard from '@/components/kpi/PremiacaoCard';
import GaugeMeta from '@/components/kpi/GaugeMeta';
import RadarKpis from '@/components/kpi/RadarKpis';
import EvolucaoMensal from '@/components/charts/EvolucaoMensal';
import InsightPanel from '@/components/insights/InsightPanel';
import DistribuidorTable from '@/components/tables/DistribuidorTable';
import { usePptDistribuidores, usePptEvolucao, usePptResumo, useInsights } from '@/hooks/usePpt';
import { pluralizar } from '@/lib/format';

export default function OverviewPage() {
  const { resumo, carregando } = usePptResumo();
  const { dados: evolucao, carregando: carregandoEvolucao } = usePptEvolucao();
  const { dados: distribuidores, carregando: carregandoDist } = usePptDistribuidores();
  const { insights, carregando: carregandoInsights } = useInsights(4);

  if (carregando || !resumo) {
    return (
      <>
        <PageHeader titulo="Overview PPT" pergunta="Onde estou hoje e quanto vou receber?" />
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Skeleton variant="rounded" height={210} />
            </Grid>
          ))}
        </Grid>
      </>
    );
  }

  const diasRestantes = Math.max(0, resumo.diasUteisTotais - resumo.diasUteisDecorridos);

  return (
    <>
      <PageHeader
        titulo="Overview PPT"
        pergunta={`Onde estou hoje e quanto vou receber? · ${pluralizar(
          diasRestantes,
          'dia útil restante',
          'dias úteis restantes',
        )} no mês`}
      />

      {/* Linha 1 — os três KPIs + premiação */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard kpi={resumo.kpis.positivacao} consolidado={resumo.consolidado} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard kpi={resumo.kpis.volume} consolidado={resumo.consolidado} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard kpi={resumo.kpis.mixHero} consolidado={resumo.consolidado} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <PremiacaoCard resumo={resumo} />
        </Grid>
      </Grid>

      {/* Linha 2 — insights ao lado de gauge e radar */}
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <InsightPanel insights={insights} carregando={carregandoInsights} />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Premiação capturada
              </Typography>
              <GaugeMeta
                ating={resumo.premioPotencial > 0 ? resumo.premioTotal / resumo.premioPotencial : 0}
                atingProjetado={
                  resumo.premioPotencial > 0 ? resumo.premioProjetado / resumo.premioPotencial : 0
                }
                titulo="do teto de 2% do sell-in"
                legenda="tracejado = projeção de fechamento"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Equilíbrio entre os KPIs
              </Typography>
              <RadarKpis resumo={resumo} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Linha 3 — evolução mensal */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
            <Typography variant="h3">Evolução mensal</Typography>
            <Typography variant="caption" color="text.secondary">
              faixa sombreada = 90% a 100% (onde a premiação muda de patamar)
            </Typography>
          </Stack>
          {carregandoEvolucao ? (
            <Skeleton variant="rounded" height={260} />
          ) : (
            <EvolucaoMensal pontos={evolucao} />
          )}
        </CardContent>
      </Card>

      {/* Linha 4 — distribuidores */}
      <Stack sx={{ mt: 3 }} spacing={1}>
        <Typography variant="h3">Distribuidores no contexto</Typography>
        <Typography variant="body2" color="text.secondary">
          Ordenado por quanto cada um ganha ao cruzar o próximo degrau — é onde a próxima hora de
          trabalho rende mais.
        </Typography>
        <DistribuidorTable linhas={distribuidores} carregando={carregandoDist} />
      </Stack>
    </>
  );
}
