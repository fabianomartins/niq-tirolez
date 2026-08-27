'use client';

import { useMemo } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageHeader from '@/components/common/PageHeader';
import { TabelaPositivacao } from '@/components/tables/OportunidadeTable';
import InsightPanel from '@/components/insights/InsightPanel';
import { useOportunidadesPositivacao, usePptResumo } from '@/hooks/usePpt';
import { gerarInsights } from '@/services/insights/engine';
import { STATUS_COLORS } from '@/lib/theme';
import { inteiro, moeda, pluralizar, toneladas } from '@/lib/format';

function Metrica({
  rotulo,
  valor,
  detalhe,
  cor,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  cor?: string;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">
          {rotulo}
        </Typography>
        <Typography sx={{ fontSize: '1.7rem', fontWeight: 700, color: cor ?? 'text.primary', lineHeight: 1.2 }}>
          {valor}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {detalhe}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function PositivacaoPage() {
  const { dados: oportunidades, carregando } = useOportunidadesPositivacao();
  const { resumo } = usePptResumo();

  const resumoNumeros = useMemo(() => {
    const volume = oportunidades.reduce((s, o) => s + o.volumePotencialPerdidoTon, 0);
    const criticos = oportunidades.filter((o) => o.prioridade === 'Critico').length;
    const heroPerdidos = oportunidades.filter((o) => o.eraHero).length;
    const valorTop = oportunidades
      .slice(0, Math.max(0, resumo?.kpis.positivacao.gapProxDegrau ?? 0))
      .reduce((s, o) => s + o.valorPorPdvRecuperado, 0);
    return { volume, criticos, heroPerdidos, valorTop };
  }, [oportunidades, resumo]);

  const insights = useMemo(
    () =>
      gerarInsights(
        {
          resumo,
          oportunidadesPositivacao: oportunidades,
          oportunidadesHero: [],
          oportunidadesRecuperacao: [],
        },
        2,
      ),
    [resumo, oportunidades],
  );

  const gap = resumo?.kpis.positivacao.gapProxDegrau ?? 0;

  return (
    <>
      <PageHeader
        titulo="Oportunidades de Positivação"
        pergunta="Quais PDVs pararam de comprar e quanto valem de volta?"
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Metrica
            rotulo="PDVs a recuperar"
            valor={inteiro(oportunidades.length)}
            detalhe="compraram nos últimos 3 meses, não compraram neste"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Metrica
            rotulo="Prioridade crítica"
            valor={inteiro(resumoNumeros.criticos)}
            detalhe={`${inteiro(resumoNumeros.heroPerdidos)} deles eram Mix Hero`}
            cor={STATUS_COLORS.abaixo}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Metrica
            rotulo="Volume em risco"
            valor={toneladas(resumoNumeros.volume)}
            detalhe="soma da média mensal dos últimos 3 meses"
            cor={STATUS_COLORS.risco}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Metrica
            rotulo="Faltam para o degrau"
            valor={gap > 0 ? pluralizar(gap, 'PDV', 'PDVs') : 'Meta batida'}
            detalhe={
              gap > 0
                ? `Recuperar os ${gap} melhores da lista vale ${moeda(resumoNumeros.valorTop)}`
                : 'Positivação já cruzou 100% da meta'
            }
            cor={gap > 0 ? STATUS_COLORS.premiada : STATUS_COLORS.meta}
          />
        </Grid>
      </Grid>

      {insights.length > 0 && (
        <Stack sx={{ mt: 2 }}>
          <InsightPanel insights={insights} titulo="Leitura da fila" />
        </Stack>
      )}

      <Stack sx={{ mt: 3 }} spacing={1}>
        <Typography variant="h3">Fila priorizada de recuperação</Typography>
        <Typography variant="body2" color="text.secondary">
          Score 0–100 combinando volume histórico (40), recência da última compra (25), frequência nos
          3 meses (20) e se o PDV era Mix Hero (15). Trabalhe de cima para baixo.
        </Typography>
        <TabelaPositivacao linhas={oportunidades} carregando={carregando} />
      </Stack>
    </>
  );
}
