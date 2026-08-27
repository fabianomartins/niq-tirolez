'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { PrioridadeChip } from '@/components/common/StatusChip';
import { STATUS_COLORS } from '@/lib/theme';
import { cnpj as fmtCnpj, dataCurta, inteiro, moeda, percentual, toneladas } from '@/lib/format';
import type { OportunidadePositivacao, OportunidadeRecuperacao } from '@/types/ppt';

function ScoreBarra({ score }: { score: number }) {
  const cor =
    score >= 75 ? STATUS_COLORS.abaixo : score >= 55 ? STATUS_COLORS.risco : STATUS_COLORS.premiada;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: '100%' }}>
      <Box sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: 'action.hover', overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.min(100, score)}%`, height: '100%', bgcolor: cor }} />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 24 }}>
        {Math.round(score)}
      </Typography>
    </Stack>
  );
}

function CelulaPdv({ pdv, cnpjValor, extra }: { pdv: string; cnpjValor: string; extra?: React.ReactNode }) {
  return (
    <Stack sx={{ py: 0.75, minWidth: 0 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="body2" fontWeight={600} noWrap>
          {pdv}
        </Typography>
        {extra}
      </Stack>
      <Typography variant="caption" color="text.secondary" noWrap>
        {fmtCnpj(cnpjValor)}
      </Typography>
    </Stack>
  );
}

/* ========================================================================== */
/* Tela 2 — Positivação                                                        */
/* ========================================================================== */

export function TabelaPositivacao({
  linhas,
  carregando,
}: {
  linhas: OportunidadePositivacao[];
  carregando?: boolean;
}) {
  const colunas = useMemo<GridColDef<OportunidadePositivacao>[]>(
    () => [
      {
        field: 'pdv',
        headerName: 'PDV',
        flex: 1.6,
        minWidth: 220,
        renderCell: (p) => (
          <CelulaPdv
            pdv={p.row.pdv}
            cnpjValor={p.row.cnpj}
            extra={
              p.row.eraHero ? (
                <Tooltip title="Este PDV já foi Mix Hero nos últimos 3 meses">
                  <EmojiEventsIcon sx={{ fontSize: 14, color: STATUS_COLORS.meta }} />
                </Tooltip>
              ) : undefined
            }
          />
        ),
      },
      { field: 'canal', headerName: 'Canal', flex: 1, minWidth: 140 },
      { field: 'cidade', headerName: 'Cidade', flex: 1, minWidth: 130 },
      {
        field: 'ultimaCompra',
        headerName: 'Última compra',
        flex: 0.9,
        minWidth: 130,
        renderCell: (p) => (
          <Stack sx={{ py: 0.75 }}>
            <Typography variant="body2">{dataCurta(p.row.ultimaCompra)}</Typography>
            <Typography variant="caption" color="text.secondary">
              há {inteiro(p.row.diasSemComprar)} dias
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'mesesAtivosU3M',
        headerName: 'Meses ativos',
        type: 'number',
        flex: 0.7,
        minWidth: 105,
        valueFormatter: (v: number) => `${v} de 3`,
      },
      {
        field: 'mediaU3MTon',
        headerName: 'Média 3 meses',
        type: 'number',
        flex: 0.9,
        minWidth: 125,
        valueFormatter: (v: number) => toneladas(v),
      },
      {
        field: 'volumePotencialPerdidoTon',
        headerName: 'Volume em risco',
        type: 'number',
        flex: 0.9,
        minWidth: 130,
        renderCell: (p) => (
          <Typography variant="body2" sx={{ fontWeight: 700, color: STATUS_COLORS.abaixo }}>
            {toneladas(p.row.volumePotencialPerdidoTon)}
          </Typography>
        ),
      },
      {
        field: 'valorPorPdvRecuperado',
        headerName: 'Vale (R$)',
        type: 'number',
        flex: 0.9,
        minWidth: 120,
        renderCell: (p) => (
          <Tooltip title="Rateio do ganho do próximo degrau de positivação pelos PDVs que ainda faltam">
            <Typography variant="body2" fontWeight={700}>
              {p.row.valorPorPdvRecuperado > 0 ? moeda(p.row.valorPorPdvRecuperado) : '—'}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: 'score',
        headerName: 'Prioridade',
        type: 'number',
        flex: 1,
        minWidth: 150,
        renderCell: (p) => (
          <Stack spacing={0.4} sx={{ width: '100%', py: 0.75 }}>
            <PrioridadeChip prioridade={p.row.prioridade} />
            <ScoreBarra score={p.row.score} />
          </Stack>
        ),
      },
    ],
    [],
  );

  return (
    <Card>
      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={linhas}
          columns={colunas}
          getRowId={(r) => r.chave}
          loading={carregando}
          localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
          initialState={{
            sorting: { sortModel: [{ field: 'score', sort: 'desc' }] },
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          rowHeight={60}
          sx={{
            border: 0,
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover' },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
          }}
        />
      </Box>
    </Card>
  );
}

/* ========================================================================== */
/* Tela 5 — Recuperação                                                        */
/* ========================================================================== */

export function TabelaRecuperacao({
  linhas,
  carregando,
}: {
  linhas: OportunidadeRecuperacao[];
  carregando?: boolean;
}) {
  const colunas = useMemo<GridColDef<OportunidadeRecuperacao>[]>(
    () => [
      {
        field: 'pdv',
        headerName: 'PDV',
        flex: 1.6,
        minWidth: 220,
        renderCell: (p) => <CelulaPdv pdv={p.row.pdv} cnpjValor={p.row.cnpj} />,
      },
      { field: 'canal', headerName: 'Canal', flex: 1, minWidth: 150 },
      {
        field: 'mediaU3MTon',
        headerName: 'Média 3 meses',
        type: 'number',
        flex: 0.9,
        minWidth: 125,
        valueFormatter: (v: number) => toneladas(v),
      },
      {
        field: 'volumeMesTon',
        headerName: 'Mês atual',
        type: 'number',
        flex: 0.8,
        minWidth: 110,
        valueFormatter: (v: number) => toneladas(v),
      },
      {
        field: 'quedaTon',
        headerName: 'Queda',
        type: 'number',
        flex: 1,
        minWidth: 140,
        renderCell: (p) => (
          <Stack sx={{ py: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: STATUS_COLORS.abaixo }}>
              − {toneladas(p.row.quedaTon)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {percentual(p.row.quedaPerc)} abaixo
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'coberturaDoGap',
        headerName: 'Cobre do gap',
        type: 'number',
        flex: 0.9,
        minWidth: 125,
        renderCell: (p) => (
          <Tooltip title="Quanto do gap de volume do distribuidor este PDV resolve se voltar à própria média">
            <Typography variant="body2" fontWeight={600}>
              {percentual(p.row.coberturaDoGap)}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: 'valorPotencial',
        headerName: 'Vale (R$)',
        type: 'number',
        flex: 0.9,
        minWidth: 120,
        valueFormatter: (v: number) => (v > 0 ? moeda(v) : '—'),
      },
      {
        field: 'score',
        headerName: 'Prioridade',
        type: 'number',
        flex: 1,
        minWidth: 150,
        renderCell: (p) => (
          <Stack spacing={0.4} sx={{ width: '100%', py: 0.75 }}>
            <PrioridadeChip prioridade={p.row.prioridade} />
            <ScoreBarra score={p.row.score} />
          </Stack>
        ),
      },
    ],
    [],
  );

  return (
    <Card>
      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={linhas}
          columns={colunas}
          getRowId={(r) => r.chave}
          loading={carregando}
          localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
          initialState={{
            sorting: { sortModel: [{ field: 'score', sort: 'desc' }] },
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          rowHeight={60}
          sx={{
            border: 0,
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover' },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
          }}
        />
      </Box>
    </Card>
  );
}
