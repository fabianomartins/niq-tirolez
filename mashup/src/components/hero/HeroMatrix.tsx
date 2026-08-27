'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import { STATUS_BG, STATUS_COLORS, TIROLEZ } from '@/lib/theme';
import { inteiro, toneladas } from '@/lib/format';
import { CATEGORIAS_HERO, CATEGORIAS_HERO_MISTAS } from '@/lib/hero';
import type { HeroMatrixRow, RecomendacaoHero } from '@/types/ppt';

const FILTROS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'falta1', rotulo: 'Falta 1', cor: STATUS_COLORS.risco },
  { id: 'falta2', rotulo: 'Falta 2+', cor: STATUS_COLORS.abaixo },
  { id: 'completo', rotulo: 'Completo', cor: STATUS_COLORS.meta },
] as const;

type FiltroId = (typeof FILTROS)[number]['id'];

const PAGINA = 60;

function Celula({
  comprou,
  rotulo,
  destaque,
}: {
  comprou: boolean;
  rotulo: string;
  destaque: boolean;
}) {
  const cor = comprou ? STATUS_COLORS.meta : destaque ? STATUS_COLORS.risco : STATUS_COLORS.abaixo;
  const fundo = comprou ? STATUS_BG.meta : destaque ? STATUS_BG.risco : STATUS_BG.abaixo;
  return (
    <Tooltip title={`${rotulo}: ${comprou ? 'comprou no mês' : 'não comprou'}`}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: 1,
          bgcolor: fundo,
          color: cor,
          border: `1px solid ${cor}44`,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: '0.85rem',
          flexShrink: 0,
        }}
        aria-label={`${rotulo}: ${comprou ? 'comprou' : 'não comprou'}`}
      >
        {comprou ? '✓' : '✕'}
      </Box>
    </Tooltip>
  );
}

/**
 * MIX HERO NAVIGATOR — a "batalha naval".
 *
 * Linhas = PDVs, colunas = as 3 categorias Hero da região. Um olhar diz quantos
 * PDVs estão a um tiro de virar Hero e em qual categoria mirar.
 *
 * A ordenação padrão coloca "Falta 1" no topo, não "Completo": a tela existe
 * para trabalhar a fila de conversão, não para celebrar quem já converteu.
 */
export default function HeroMatrix({
  linhas,
  recomendacoes,
  onSelecionarPdv,
}: {
  linhas: HeroMatrixRow[];
  recomendacoes: RecomendacaoHero[];
  onSelecionarPdv?: (linha: HeroMatrixRow) => void;
}) {
  const [filtro, setFiltro] = useState<FiltroId>('falta1');
  const [busca, setBusca] = useState('');
  const [visiveis, setVisiveis] = useState(PAGINA);

  const recomendacaoPorPdv = useMemo(() => {
    const m = new Map<string, RecomendacaoHero>();
    for (const r of recomendacoes) {
      const atual = m.get(r.cnpj);
      if (!atual || r.score > atual.score) m.set(r.cnpj, r);
    }
    return m;
  }, [recomendacoes]);

  const contagens = useMemo(
    () => ({
      todos: linhas.length,
      falta1: linhas.filter((l) => l.qtdCategorias === 2).length,
      falta2: linhas.filter((l) => l.qtdCategorias <= 1).length,
      completo: linhas.filter((l) => l.qtdCategorias === 3).length,
    }),
    [linhas],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas
      .filter((l) => {
        if (filtro === 'falta1' && l.qtdCategorias !== 2) return false;
        if (filtro === 'falta2' && l.qtdCategorias > 1) return false;
        if (filtro === 'completo' && l.qtdCategorias !== 3) return false;
        if (termo && !l.pdv.toLowerCase().includes(termo) && !l.cnpj.includes(termo)) return false;
        return true;
      })
      .sort((a, b) => b.qtdCategorias - a.qtdCategorias || b.volumeTon - a.volumeTon);
  }, [linhas, filtro, busca]);

  // Todas as linhas visíveis compartilham a composição da própria região; quando
  // o recorte mistura SP e demais, mostramos os dois rótulos na coluna 3.
  const composicoes = new Set(filtradas.map((l) => l.regiaoHero));
  const rotulos: [string, string, string] =
    composicoes.size === 1 && composicoes.has('SP')
      ? CATEGORIAS_HERO.SP
      : composicoes.size === 1
        ? CATEGORIAS_HERO.DEMAIS
        : CATEGORIAS_HERO_MISTAS;

  return (
    <Card sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {FILTROS.map((f) => (
            <Chip
              key={f.id}
              label={`${f.rotulo} · ${inteiro(contagens[f.id])}`}
              onClick={() => {
                setFiltro(f.id);
                setVisiveis(PAGINA);
              }}
              variant={filtro === f.id ? 'filled' : 'outlined'}
              sx={
                filtro === f.id && 'cor' in f && f.cor
                  ? { bgcolor: f.cor, color: '#fff', '&:hover': { bgcolor: f.cor } }
                  : undefined
              }
            />
          ))}
        </Stack>

        <TextField
          size="small"
          placeholder="Buscar PDV ou CNPJ"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setVisiveis(PAGINA);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 240 }}
        />
      </Stack>

      <Box className="ppt-scroll-x">
        <Box sx={{ minWidth: 720 }}>
          {/* Cabeçalho */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="flex-end"
            sx={{ pb: 1, borderBottom: '2px solid', borderColor: 'divider' }}
          >
            <Box sx={{ width: 240, flexShrink: 0 }}>
              <Typography variant="subtitle2" color="text.secondary">
                PDV
              </Typography>
            </Box>
            {rotulos.map((r, i) => (
              <Box key={r} sx={{ width: 30, flexShrink: 0, textAlign: 'center' }}>
                <Tooltip title={r}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    C{i + 1}
                  </Typography>
                </Tooltip>
              </Box>
            ))}
            <Box sx={{ width: 88, flexShrink: 0, textAlign: 'right' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Volume
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Próxima ação
              </Typography>
            </Box>
          </Stack>

          {filtradas.slice(0, visiveis).map((l) => {
            const reco = recomendacaoPorPdv.get(l.cnpj);
            const faltaUma = l.qtdCategorias === 2;
            return (
              <Stack
                key={l.chave}
                direction="row"
                spacing={1}
                alignItems="center"
                onClick={() => onSelecionarPdv?.(l)}
                sx={{
                  py: 0.75,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  cursor: onSelecionarPdv ? 'pointer' : 'default',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box sx={{ width: 240, flexShrink: 0, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {l.pdv}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {l.canal}
                  </Typography>
                </Box>

                {l.categorias.map((c, i) => (
                  <Celula
                    key={`${l.chave}-${i}`}
                    comprou={c === 'comprou'}
                    rotulo={rotulos[i] ?? `Categoria ${i + 1}`}
                    destaque={faltaUma}
                  />
                ))}

                <Box sx={{ width: 88, flexShrink: 0, textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">
                    {toneladas(l.volumeTon)}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, minWidth: 200 }}>
                  {l.qtdCategorias === 3 ? (
                    <Typography variant="caption" sx={{ color: STATUS_COLORS.meta, fontWeight: 600 }}>
                      Hero completo
                    </Typography>
                  ) : reco ? (
                    <Typography variant="caption" color="text.secondary">
                      Vender{' '}
                      <Box component="span" sx={{ fontWeight: 700, color: TIROLEZ.carvao }}>
                        {reco.skuDescricao}
                      </Box>
                      {faltaUma ? ' → vira Hero' : ` (faltam ${l.qtdCategorias === 1 ? 2 : 3} categorias)`}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Falta: {l.categoriasFaltantes || '—'}
                    </Typography>
                  )}
                </Box>
              </Stack>
            );
          })}
        </Box>
      </Box>

      {filtradas.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
          Nenhum PDV neste recorte.
        </Typography>
      )}

      {visiveis < filtradas.length && (
        <Stack alignItems="center" sx={{ pt: 2 }}>
          <Button onClick={() => setVisiveis((v) => v + PAGINA)}>
            Carregar mais ({inteiro(filtradas.length - visiveis)} restantes)
          </Button>
        </Stack>
      )}
    </Card>
  );
}
