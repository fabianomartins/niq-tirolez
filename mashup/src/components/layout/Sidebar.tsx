'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import SpeedIcon from '@mui/icons-material/Speed';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GridViewIcon from '@mui/icons-material/GridView';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

export const LARGURA_SIDEBAR = 236;

interface ItemNav {
  href: string;
  rotulo: string;
  pergunta: string;
  icone: React.ReactNode;
}

/**
 * A navegação é organizada pela PERGUNTA que cada tela responde, não pelo tipo
 * de objeto que ela contém. Um vendedor não procura "tabela de PDVs" — ele
 * procura "quem eu visito hoje".
 */
const ACOMPANHAR: ItemNav[] = [
  {
    href: '/overview',
    rotulo: 'Overview PPT',
    pergunta: 'Onde estou e quanto vou receber?',
    icone: <SpeedIcon fontSize="small" />,
  },
  {
    href: '/executivo',
    rotulo: 'Visão Executivo',
    pergunta: 'Qual distribuidor está em risco?',
    icone: <SupervisorAccountIcon fontSize="small" />,
  },
];

const AGIR: ItemNav[] = [
  {
    href: '/positivacao',
    rotulo: 'Oportunidades de Positivação',
    pergunta: 'Quais PDVs sumiram?',
    icone: <StorefrontIcon fontSize="small" />,
  },
  {
    href: '/mix-hero',
    rotulo: 'Mix Hero Navigator',
    pergunta: 'Qual PDV está incompleto?',
    icone: <GridViewIcon fontSize="small" />,
  },
  {
    href: '/oportunidades-hero',
    rotulo: 'Oportunidades Hero',
    pergunta: 'Qual SKU vender?',
    icone: <LocalOfferIcon fontSize="small" />,
  },
  {
    href: '/recuperacao',
    rotulo: 'Potencial de Recuperação',
    pergunta: 'Quem está comprando menos?',
    icone: <TrendingDownIcon fontSize="small" />,
  },
];

function Grupo({ titulo, itens, ativo }: { titulo: string; itens: ItemNav[]; ativo: string }) {
  return (
    <List
      dense
      subheader={
        <ListSubheader
          disableSticky
          sx={{
            bgcolor: 'transparent',
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            fontWeight: 700,
            color: 'text.secondary',
            lineHeight: 2.4,
          }}
        >
          {titulo}
        </ListSubheader>
      }
    >
      {itens.map((item) => {
        const selecionado = ativo === item.href;
        return (
          <ListItemButton
            key={item.href}
            component={Link}
            href={item.href}
            selected={selecionado}
            sx={{
              mx: 1,
              borderRadius: 1.5,
              alignItems: 'flex-start',
              '&.Mui-selected': { bgcolor: 'primary.main', color: 'common.white' },
              '&.Mui-selected:hover': { bgcolor: 'primary.dark' },
              '&.Mui-selected .MuiListItemIcon-root': { color: 'common.white' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, mt: 0.4 }}>{item.icone}</ListItemIcon>
            <ListItemText
              primary={item.rotulo}
              secondary={item.pergunta}
              primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
              secondaryTypographyProps={{
                fontSize: '0.7rem',
                color: selecionado ? 'rgba(255,255,255,0.78)' : 'text.secondary',
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}

export default function Sidebar({
  aberto,
  onFechar,
  modoMock,
}: {
  aberto: boolean;
  onFechar: () => void;
  modoMock: boolean;
}) {
  const pathname = usePathname() ?? '';

  const conteudo = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 1 }}>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <Grupo titulo="Acompanhar" itens={ACOMPANHAR} ativo={pathname} />
        <Grupo titulo="Agir" itens={AGIR} ativo={pathname} />
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {modoMock && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label="Base sintética"
            sx={{ mb: 1 }}
          />
        )}
        <Typography variant="caption" color="text.secondary" display="block">
          Premiação até 2% do sell-in
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Positivação 0,70% · Volume 0,70% · Hero 0,60%
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: LARGURA_SIDEBAR,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: LARGURA_SIDEBAR,
            boxSizing: 'border-box',
            top: 'var(--ppt-shell-header)',
            height: 'calc(100% - var(--ppt-shell-header))',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {conteudo}
      </Drawer>

      <Drawer
        variant="temporary"
        open={aberto}
        onClose={onFechar}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: LARGURA_SIDEBAR, boxSizing: 'border-box' },
        }}
      >
        {conteudo}
      </Drawer>
    </>
  );
}
