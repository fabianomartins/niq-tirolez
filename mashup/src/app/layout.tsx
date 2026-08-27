import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Providers from './providers';
import AppShell from '@/components/layout/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'PPT — Programa Por Performance Tirolez',
  description:
    'Sales Execution Cockpit do PPT: o que falta, onde atuar, qual PDV visitar, qual SKU vender e quanto isso vale em premiação.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1B7A3E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppRouterCacheProvider options={{ key: 'ppt' }}>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
