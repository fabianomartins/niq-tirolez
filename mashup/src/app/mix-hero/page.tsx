'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Drawer from '@mui/material/Drawer';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import PageHeader from '@/components/common/PageHeader';
import HeroMatrix from '@/components/hero/HeroMatrix';
import RecomendacaoCard from '@/components/hero/RecomendacaoCard';
import { useHeroMatrix, usePptResumo, useRecomendacoesHero } from '@/hooks/usePpt';
import { CATEGORIAS_HERO, CATEGORIAS_HERO_MISTAS } from '@/lib/hero';
import { STATUS_COLORS } from '@/lib/theme';
import { cnpj as fmtCnpj, inteiro, moeda, percentual, pluralizar } from '@/lib/format';
import type { HeroMatrixRow } from '@/types/ppt';

export default function MixHeroPage() {
  const { dados: matriz, carregando } = useHeroMatrix();
  const { dados: recomendacoes } = useRecomendacoesHero();
  const { resumo } = usePptResumo();
  const [selecionado, setSelecionado] = useState<HeroMatrixRow | null>(null);

  const contagens = useMemo(
    () => ({
      completos: matriz.filter((l) => l.qtdCategorias === 3).length,
      falta1: matriz.filter((l) => l.qtdCategorias === 2).length,
      falta2: matriz.filter((l) => l.qtdCategorias <= 1).length,
      total: matriz.length,
    }),
    [matriz],
  );

  const kpi = resumo?.kpis.mixHero;
  const gap = kpi?.gapProxDegrau ?? 0;

  const recomendacoesDoSelecionado = useMemo(
    () => (selecionado ? recomendacoes.filter((r) => r.cnpj === selecionado.cnpj) : []),
    [recomendacoes, selecionado],
  );

  const categoriasDoSelecionado: [string, string, string] = selecionado
    ? CATEGORIAS_HERO[selecionado.regiaoHero]
    : CATEGORIAS_HERO_MISTAS;

  return (
    <>
      <PageHeader
        titulo="Mix Hero Navigator"
        pergunta="Qual PDV está incompleto, em qual categoria, e qual SKU fecha o mix?"
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Placar
            rotulo="PDVs Hero"
            valor={inteiro(contagens.completos)}
            detalhe={
              kpi ? `meta ${inteiro(kpi.meta)} · ${percentual(kpi.ating)}` : `de ${inteiro(contagens.total)}`
            }
            cor={STATUS_COLORS.meta}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Placar
            rotulo="Falta 1 categoria"
            valor={inteiro(contagens.falta1)}
            detalhe="a fila de conversão mais barata"
            cor={STATUS_COLORS.risco}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Placar
            rotulo="Falta 2+"
            valor={inteiro(contagens.falta2)}
            detalhe="exige mais de uma venda"
            cor={STATUS_COLORS.abaixo}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Placar
            rotulo="Para o próximo degrau"
            valor={gap > 0 ? pluralizar(gap, 'PDV', 'PDVs') : 'Meta batida'}
            detalhe={
              gap > 0 && kpi
                ? `vale ${moeda(kpi.ganhoProxDegrau)} · há ${inteiro(contagens.falta1)} candidatos`
                : 'Mix Hero já cruzou 100%'
            }
            cor={gap > 0 ? STATUS_COLORS.premiada : STATUS_COLORS.meta}
          />
        </Grid>
      </Grid>

      {carregando ? (
        <Card sx={{ p: 4 }}>
          <Typography color="text.secondary">Montando a matriz…</Typography>
        </Card>
      ) : (
        <HeroMatrix linhas={matriz} recomendacoes={recomendacoes} onSelecionarPdv={setSelecionado} />
      )}

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
        Composição Hero: São Paulo usa Fatiados na Categoria 3; demais regiões usam Manteiga. Um PDV é
        Hero com ao menos 1 SKU de cada categoria — não precisa comprar todos.
      </Typography>

      {/* Drill até SKU */}
      <Drawer
        anchor="right"
        open={selecionado !== null}
        onClose={() => setSelecionado(null)}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 }, p: 2.5 } } }}
      >
        {selecionado && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h3" noWrap>
                  {selecionado.pdv}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {fmtCnpj(selecionado.cnpj)} · {selecionado.canal}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelecionado(null)} aria-label="Fechar">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Situação do mix neste mês
                </Typography>
                <Stack spacing={0.75}>
                  {categoriasDoSelecionado.map((cat, i) => {
                    const tem = selecionado.categorias[i] === 'comprou';
                    return (
                      <Stack key={cat} direction="row" justifyContent="space-between">
                        <Typography variant="body2">{cat}</Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: tem ? STATUS_COLORS.meta : STATUS_COLORS.abaixo }}
                        >
                          {tem ? 'comprou' : 'falta'}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>

            {recomendacoesDoSelecionado.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {selecionado.qtdCategorias === 3
                  ? 'PDV já é Mix Hero neste mês. Nada a fazer aqui.'
                  : 'Sem recomendação disponível para este PDV no mês selecionado.'}
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  O que vender
                </Typography>
                {recomendacoesDoSelecionado.map((r) => (
                  <RecomendacaoCard
                    key={r.chave}
                    recomendacao={r}
                    situacao={selecionado}
                    categorias={categoriasDoSelecionado}
                  />
                ))}
              </Stack>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

function Placar({
  rotulo,
  valor,
  detalhe,
  cor,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  cor: string;
}) {
  return (
    <Card className="ppt-kpi-card" sx={{ height: '100%', '--ppt-status-color': cor }}>
      <CardContent sx={{ py: 1.75 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {rotulo}
        </Typography>
        <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: cor, lineHeight: 1.2 }}>
          {valor}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {detalhe}
        </Typography>
      </CardContent>
    </Card>
  );
}
