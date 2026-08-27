'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageHeader from '@/components/common/PageHeader';
import RecomendacaoCard from '@/components/hero/RecomendacaoCard';
import { useHeroMatrix, usePptResumo, useRecomendacoesHero } from '@/hooks/usePpt';
import { CATEGORIAS_HERO, CATEGORIAS_HERO_MISTAS } from '@/lib/hero';
import { STATUS_COLORS } from '@/lib/theme';
import { inteiro, moeda, percentual, pluralizar } from '@/lib/format';

const PAGINA = 12;

export default function OportunidadesHeroPage() {
  const { dados: recomendacoes, carregando } = useRecomendacoesHero();
  const { dados: matriz } = useHeroMatrix();
  const { resumo } = usePptResumo();

  const [somenteConversao, setSomenteConversao] = useState(true);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [visiveis, setVisiveis] = useState(PAGINA);

  const situacaoPorCnpj = useMemo(() => new Map(matriz.map((m) => [m.cnpj, m])), [matriz]);

  const categorias = useMemo(
    () => [...new Set(recomendacoes.map((r) => r.categoriaFaltante))].sort(),
    [recomendacoes],
  );

  const filtradas = useMemo(
    () =>
      recomendacoes
        .filter((r) => (!somenteConversao || r.converteSozinho) && (!categoria || r.categoriaFaltante === categoria))
        .sort((a, b) => b.score - a.score),
    [recomendacoes, somenteConversao, categoria],
  );

  /** Quantos PDVs distintos as recomendações filtradas conseguem converter. */
  const conversoesPossiveis = useMemo(
    () => new Set(filtradas.filter((r) => r.converteSozinho).map((r) => r.cnpj)).size,
    [filtradas],
  );

  const kpi = resumo?.kpis.mixHero;
  const gap = kpi?.gapProxDegrau ?? 0;
  const novoAting = kpi && kpi.meta > 0 ? (kpi.real + conversoesPossiveis) / kpi.meta : 0;

  return (
    <>
      <PageHeader
        titulo="Oportunidades Hero"
        pergunta="Qual SKU vender, para qual PDV, e quanto isso vale na premiação?"
      />

      {kpi && conversoesPossiveis > 0 && (
        <Alert
          severity={gap > 0 && conversoesPossiveis >= gap ? 'success' : 'info'}
          sx={{ mb: 2 }}
          icon={false}
        >
          <Typography variant="body2">
            Convertendo os <strong>{inteiro(conversoesPossiveis)} PDVs</strong> desta lista, o Mix Hero
            vai de <strong>{percentual(kpi.ating)}</strong> para <strong>{percentual(novoAting)}</strong>
            {gap > 0 && (
              <>
                {' '}
                — {conversoesPossiveis >= gap ? 'mais que suficiente' : 'ainda insuficiente'} para o
                próximo degrau, que exige {pluralizar(gap, 'conversão', 'conversões')} e vale{' '}
                <strong>{moeda(kpi.ganhoProxDegrau)}</strong>.
              </>
            )}
          </Typography>
        </Alert>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          label="Só quem vira Hero com 1 venda"
          onClick={() => {
            setSomenteConversao((v) => !v);
            setVisiveis(PAGINA);
          }}
          variant={somenteConversao ? 'filled' : 'outlined'}
          sx={somenteConversao ? { bgcolor: STATUS_COLORS.risco, color: '#fff' } : undefined}
        />
        <Chip
          label="Todas as categorias"
          onClick={() => {
            setCategoria(null);
            setVisiveis(PAGINA);
          }}
          variant={categoria === null ? 'filled' : 'outlined'}
        />
        {categorias.map((c) => (
          <Chip
            key={c}
            label={c.replace(/^Cat \d+ - /, '')}
            onClick={() => {
              setCategoria(c);
              setVisiveis(PAGINA);
            }}
            variant={categoria === c ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {carregando ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }, (_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={280} />
            </Grid>
          ))}
        </Grid>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Nenhuma recomendação neste recorte. Tente remover o filtro de conversão imediata.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={2}>
            {filtradas.slice(0, visiveis).map((r) => {
              const situacao = situacaoPorCnpj.get(r.cnpj);
              const cats = situacao ? CATEGORIAS_HERO[situacao.regiaoHero] : CATEGORIAS_HERO_MISTAS;
              return (
                <Grid key={r.chave} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <RecomendacaoCard recomendacao={r} situacao={situacao} categorias={cats} />
                </Grid>
              );
            })}
          </Grid>

          {visiveis < filtradas.length && (
            <Stack alignItems="center" sx={{ mt: 2.5 }}>
              <Button variant="outlined" onClick={() => setVisiveis((v) => v + PAGINA)}>
                Carregar mais ({inteiro(filtradas.length - visiveis)} restantes)
              </Button>
            </Stack>
          )}
        </>
      )}
    </>
  );
}
