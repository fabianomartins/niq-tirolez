'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { RiscoChip } from '@/components/common/StatusChip';
import { corDeAtingimento } from '@/lib/status';
import { moeda, percentual } from '@/lib/format';
import type { DistribuidorRow } from '@/types/ppt';

function BarraAtingimento({ valor }: { valor: number }) {
  const cor = corDeAtingimento(valor);
  return (
    <Stack spacing={0.4} sx={{ width: '100%', py: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: cor, lineHeight: 1 }}>
        {percentual(valor)}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, valor * 100)}
        sx={{
          height: 5,
          borderRadius: 3,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: cor, borderRadius: 3 },
        }}
      />
    </Stack>
  );
}

/**
 * Tabela de distribuidores.
 *
 * Ordenada por "ganho ao cruzar o próximo degrau", não por atingimento: o
 * executivo quer saber onde a próxima hora de trabalho rende mais, e isso nem
 * sempre é o distribuidor mais atrasado.
 */
export default function DistribuidorTable({
  linhas,
  carregando,
  altura = 480,
}: {
  linhas: DistribuidorRow[];
  carregando?: boolean;
  altura?: number;
}) {
  const colunas = useMemo<GridColDef<DistribuidorRow>[]>(
    () => [
      { field: 'distribuidor', headerName: 'Distribuidor', flex: 1.4, minWidth: 170 },
      { field: 'regiao', headerName: 'Região', flex: 0.9, minWidth: 120 },
      { field: 'executivo', headerName: 'Executivo', flex: 1, minWidth: 130 },
      {
        field: 'atingPositivacao',
        headerName: 'Positivação',
        type: 'number',
        flex: 0.9,
        minWidth: 110,
        renderCell: (p) => <BarraAtingimento valor={p.row.atingPositivacao} />,
      },
      {
        field: 'atingVolume',
        headerName: 'Volume',
        type: 'number',
        flex: 0.9,
        minWidth: 110,
        renderCell: (p) => <BarraAtingimento valor={p.row.atingVolume} />,
      },
      {
        field: 'atingMixHero',
        headerName: 'Mix Hero',
        type: 'number',
        flex: 0.9,
        minWidth: 110,
        renderCell: (p) => <BarraAtingimento valor={p.row.atingMixHero} />,
      },
      {
        field: 'premioTotal',
        headerName: 'Premiação',
        type: 'number',
        flex: 1,
        minWidth: 130,
        valueFormatter: (v: number) => moeda(v),
      },
      {
        field: 'ganhoProxDegrau',
        headerName: 'Ganho no próx. degrau',
        type: 'number',
        flex: 1.1,
        minWidth: 165,
        renderCell: (p) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: p.row.ganhoProxDegrau > 0 ? 'warning.dark' : 'text.disabled' }}
          >
            {p.row.ganhoProxDegrau > 0 ? `+ ${moeda(p.row.ganhoProxDegrau)}` : '—'}
          </Typography>
        ),
      },
      {
        field: 'statusRisco',
        headerName: 'Status',
        flex: 0.9,
        minWidth: 120,
        renderCell: (p) => <RiscoChip status={p.row.statusRisco} />,
      },
    ],
    [],
  );

  return (
    <Card>
      <Box sx={{ height: altura, width: '100%' }}>
        <DataGrid
          rows={linhas}
          columns={colunas}
          getRowId={(r) => r.distribuidorId}
          loading={carregando}
          localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
          initialState={{
            sorting: { sortModel: [{ field: 'ganhoProxDegrau', sort: 'desc' }] },
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          rowHeight={54}
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
