'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * Cabeçalho de tela. O subtítulo é sempre a PERGUNTA que a tela responde —
 * quem abre precisa saber em dois segundos se está no lugar certo.
 */
export default function PageHeader({
  titulo,
  pergunta,
  acao,
}: {
  titulo: string;
  pergunta: string;
  acao?: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
      justifyContent="space-between"
      sx={{ mb: 2.5 }}
    >
      <Box>
        <Typography variant="h1">{titulo}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {pergunta}
        </Typography>
      </Box>
      {acao}
    </Stack>
  );
}
