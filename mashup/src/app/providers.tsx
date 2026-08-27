'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/lib/theme';
import { QlikProvider } from '@/hooks/useQlik';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QlikProvider>{children}</QlikProvider>
    </ThemeProvider>
  );
}
