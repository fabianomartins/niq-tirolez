'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useGlobalFilters } from '@/hooks/useQlik';
import { labelMes } from '@/lib/format';
import type { GlobalFilters as Filtros } from '@/types/ppt';

const CAMPOS: Array<{ chave: keyof Filtros; rotulo: string; larguraMin: number }> = [
  { chave: 'anoMes', rotulo: 'Competência', larguraMin: 140 },
  { chave: 'regiao', rotulo: 'Região', larguraMin: 150 },
  { chave: 'executivo', rotulo: 'Executivo', larguraMin: 160 },
  { chave: 'distribuidor', rotulo: 'Distribuidor', larguraMin: 190 },
  { chave: 'canal', rotulo: 'Canal', larguraMin: 190 },
];

/**
 * Barra de filtros globais. Aplica seleção direto no estado do documento Qlik —
 * toda tela e todo objeto reagem juntos, inclusive os que o usuário não está
 * vendo. É o comportamento associativo que o usuário de Qlik espera.
 */
export default function GlobalFiltersBar() {
  const { filtros, opcoes, definir, limparTudo, carregando } = useGlobalFilters();

  if (carregando) {
    return (
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {CAMPOS.map((c) => (
          <Skeleton key={c.chave} variant="rounded" width={c.larguraMin} height={40} />
        ))}
      </Box>
    );
  }

  const algumAtivo = CAMPOS.some((c) => c.chave !== 'anoMes' && filtros[c.chave] !== null);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {CAMPOS.map(({ chave, rotulo, larguraMin }) => {
        const valores = opcoes[chave] ?? [];
        return (
          <TextField
            key={chave}
            select
            size="small"
            label={rotulo}
            value={filtros[chave] ?? ''}
            onChange={(e) => definir(chave, e.target.value === '' ? null : e.target.value)}
            sx={{ minWidth: larguraMin, bgcolor: 'background.paper' }}
            slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 360 } } } } } }}
          >
            <MenuItem value="">
              <em>{chave === 'anoMes' ? 'Mês corrente' : 'Todos'}</em>
            </MenuItem>
            {valores.map((v) => (
              <MenuItem key={v} value={v}>
                {chave === 'anoMes' ? labelMes(v) : v}
              </MenuItem>
            ))}
          </TextField>
        );
      })}

      <Button
        size="small"
        color="inherit"
        startIcon={<FilterAltOffIcon />}
        onClick={limparTudo}
        disabled={!algumAtivo}
        sx={{ color: 'text.secondary' }}
      >
        Limpar
      </Button>
    </Box>
  );
}
