'use client';

/**
 * Fábrica do provider de dados.
 *
 * A escolha entre Engine e Mock acontece UMA vez, aqui. Nenhum componente ou
 * hook faz `if (mock)`. Se a conexão com o tenant falhar, o cockpit cai para o
 * modo mock com um aviso visível em vez de mostrar tela branca — em demo e em
 * treinamento isso é a diferença entre a reunião continuar ou não.
 */

import { EngineProvider, openQlikApp } from './engine';
import { MockProvider } from '@/services/mock/provider';
import type { QlikDataProvider } from '@/types/qlik';

export interface ProviderResult {
  provider: QlikDataProvider;
  /** Preenchido quando caímos para mock por falha de conexão. */
  aviso?: string;
}

function configuracao() {
  return {
    mock: process.env.NEXT_PUBLIC_QLIK_MOCK === 'true',
    tenant: process.env.NEXT_PUBLIC_QLIK_TENANT ?? '',
    appId: process.env.NEXT_PUBLIC_QLIK_APP_ID ?? '',
    webIntegrationId: process.env.NEXT_PUBLIC_QLIK_WEB_INTEGRATION_ID ?? '',
  };
}

let cache: Promise<ProviderResult> | null = null;

export function criarProvider(): Promise<ProviderResult> {
  if (cache) return cache;

  cache = (async (): Promise<ProviderResult> => {
    const cfg = configuracao();

    if (cfg.mock || !cfg.tenant || !cfg.appId) {
      return {
        provider: new MockProvider(),
        aviso: cfg.mock
          ? undefined
          : 'Tenant Qlik não configurado — exibindo base sintética.',
      };
    }

    try {
      const app = await openQlikApp({
        tenant: cfg.tenant,
        appId: cfg.appId,
        webIntegrationId: cfg.webIntegrationId || undefined,
      });
      return { provider: new EngineProvider(app) };
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err);
      return {
        provider: new MockProvider(),
        aviso: `Falha ao conectar no Qlik (${motivo}). Exibindo base sintética.`,
      };
    }
  })();

  return cache;
}

/** Usado nos testes para forçar uma nova resolução. */
export function resetProvider(): void {
  cache = null;
}
