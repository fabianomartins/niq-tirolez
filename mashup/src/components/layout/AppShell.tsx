'use client';

import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar, { LARGURA_SIDEBAR } from './Sidebar';
import GlobalFiltersBar from './GlobalFilters';
import { useQlik } from '@/hooks/useQlik';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { carregando, erro, aviso, provider } = useQlik();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          height: 'var(--ppt-shell-header)',
          justifyContent: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'primary.main',
          color: 'common.white',
        }}
      >
        <Toolbar variant="dense" sx={{ gap: 1.5 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto((v) => !v)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Avatar
            variant="rounded"
            sx={{
              bgcolor: 'common.white',
              color: 'primary.main',
              width: 32,
              height: 32,
              fontWeight: 800,
              fontSize: '0.8rem',
            }}
          >
            PPT
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h3" sx={{ fontSize: '1rem', lineHeight: 1.2 }} noWrap>
              Programa Por Performance Tirolez
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>
              Sales Execution Cockpit
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Typography variant="caption" sx={{ opacity: 0.85, display: { xs: 'none', sm: 'block' } }}>
            {provider?.mode === 'mock' ? 'Dados sintéticos' : 'Qlik Cloud'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Sidebar
        aberto={menuAberto}
        onFechar={() => setMenuAberto(false)}
        modoMock={provider?.mode === 'mock'}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${LARGURA_SIDEBAR}px)` },
          pt: 'var(--ppt-shell-header)',
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 'var(--ppt-shell-header)',
            zIndex: 2,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: { xs: 2, md: 3 },
            py: 1.5,
          }}
        >
          <GlobalFiltersBar />
        </Box>

        <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
          {erro && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erro}
            </Alert>
          )}
          {aviso && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {aviso}
            </Alert>
          )}

          {carregando ? (
            <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
              <CircularProgress />
              <Typography color="text.secondary">Conectando ao modelo PPT…</Typography>
            </Stack>
          ) : (
            children
          )}
        </Container>
      </Box>
    </Box>
  );
}
