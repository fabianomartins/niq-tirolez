'use client';

import { useMemo } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageHeader from '@/components/common/PageHeader';
import DistribuidorTable from '@/components/tables/DistribuidorTable';
import MapaRegional from '@/components/charts/MapaRegional';
import InsightPanel from '@/components/insights/InsightPanel';
import { useInsights, useMapaExecutivo, usePptDistribuidores, usePptResumo } from '@/hooks/usePpt';
import { STATUS_COLORS } from '@/lib/theme';
import { inteiro, moeda, percentual } from '@/lib/format';

function CardExecutivo({
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
    <Card className="ppt-kpi-card" sx={{ height: '100%', '--ppt-status-color': cor ?? 'transparent' }}>
      <CardContent sx={{ py: 1.75 }}>
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

export default function ExecutivoPage() {
  const { dados: distribuidores, carregando } = usePptDistribuidores();
  const { dados: mapa } = useMapaExecutivo();
  const { resumo } = usePptResumo();
  const { insights, carregando: carregandoInsights } = useInsights(3);

  const numeros = useMemo(() => {
    const ativos = distribuidores.length;
    const risco = distribuidores.filter((d) => d.statusRisco === 'Risco alto').length;
    const heroAbaixo = distribuidores.filter((d) => d.atingMixHero < 0.9).length;
    const noAlvo = distribuidores.filter((d) => d.statusRisco === 'No alvo').length;
    const projetada = distribuidores.reduce((s, d) => s + d.premioTotal, 0);
    const potencial = distribuidores.reduce((s, d) => s + d.premioPotencial, 0);
    const ganho = distribuidores.reduce((s, d) => s + d.ganhoProxDegrau, 0);
    return { ativos, risco, heroAbaixo, noAlvo, projetada, potencial, ganho };
  }, [distribuidores]);

  const ranking = useMemo(
    () => [...distribuidores].sort((a, b) => b.ganhoProxDegrau - a.ganhoProxDegrau).slice(0, 5),
    [distribuidores],
  );

  return (
    <>
      <PageHeader
        titulo="Visão Executivo"
        pergunta="Qual distribuidor da minha carteira está em risco e onde minha visita rende mais?"
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <CardExecutivo
            rotulo="Distribuidores ativos"
            valor={inteiro(numeros.ativos)}
            detalhe={`${inteiro(numeros.noAlvo)} projetam fechar os 3 KPIs no alvo`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <CardExecutivo
            rotulo="Premiação projetada"
            valor={moeda(resumo?.premioProjetado ?? numeros.projetada)}
            detalhe={`de ${moeda(numeros.potencial)} possíveis · ${percentual(
              numeros.potencial > 0 ? numeros.projetada / numeros.potencial : 0,
              0,
            )} do teto`}
            cor={STATUS_COLORS.meta}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <CardExecutivo
            rotulo="Distribuidores em risco"
            valor={inteiro(numeros.risco)}
            detalhe="projeção aponta ao menos 1 KPI abaixo de 90%"
            cor={STATUS_COLORS.abaixo}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <CardExecutivo
            rotulo="Hero abaixo da meta"
            valor={inteiro(numeros.heroAbaixo)}
            detalhe={`ganho disponível na carteira: ${moeda(numeros.ganho)}`}
            cor={STATUS_COLORS.risco}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>
                Mapa da carteira
              </Typography>
              <MapaRegional linhas={mapa} />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2}>
            <InsightPanel
              insights={insights}
              carregando={carregandoInsights}
              titulo="Prioridades da carteira"
            />

            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 0.5 }}>
                  Onde a próxima visita rende mais
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Top 5 por ganho ao cruzar o próximo degrau.
                </Typography>

                <Stack spacing={1}>
                  {ranking.map((d, i) => (
                    <Stack
                      key={d.distribuidorId}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{ py: 0.5, borderBottom: i < ranking.length - 1 ? '1px solid' : 0, borderColor: 'divider' }}
                    >
                      <Typography
                        sx={{
                          width: 22,
                          textAlign: 'center',
                          fontWeight: 800,
                          color: 'text.disabled',
                        }}
                      >
                        {i + 1}
                      </Typography>
                      <Stack sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {d.distribuidor}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {d.regiao} · Pos {percentual(d.atingPositivacao, 0)} · Vol{' '}
                          {percentual(d.atingVolume, 0)} · Hero {percentual(d.atingMixHero, 0)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                        + {moeda(d.ganhoProxDegrau)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Stack sx={{ mt: 3 }} spacing={1}>
        <Typography variant="h3">Carteira completa</Typography>
        <DistribuidorTable linhas={distribuidores} carregando={carregando} altura={560} />
      </Stack>
    </>
  );
}
