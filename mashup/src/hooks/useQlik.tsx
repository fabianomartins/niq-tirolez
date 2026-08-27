'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { criarProvider } from '@/services/qlik/provider';
import type { CompiledCube } from '@/services/hypercubes/definitions';
import type { FieldSelection, QlikCell, QlikDataProvider } from '@/types/qlik';
import { FILTROS_VAZIOS, type GlobalFilters } from '@/types/ppt';

/* ========================================================================== */
/* Contexto                                                                    */
/* ========================================================================== */

interface QlikContextValue {
  provider: QlikDataProvider | null;
  carregando: boolean;
  erro: string | null;
  aviso: string | null;
  /** Incrementa a cada mudança de seleção — chave de invalidação dos hooks. */
  versao: number;
  selecionar: (selecao: FieldSelection) => Promise<void>;
  limpar: (campo?: string) => Promise<void>;
}

const QlikContext = createContext<QlikContextValue | null>(null);

export function QlikProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<QlikDataProvider | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    let desinscrever: (() => void) | undefined;

    criarProvider()
      .then(({ provider: p, aviso: a }) => {
        if (!vivo) return;
        setProvider(p);
        setAviso(a ?? null);
        desinscrever = p.onInvalidate(() => setVersao((v) => v + 1));
      })
      .catch((e: unknown) => {
        if (vivo) setErro(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });

    return () => {
      vivo = false;
      desinscrever?.();
    };
  }, []);

  const selecionar = useCallback(
    async (selecao: FieldSelection) => {
      if (!provider) return;
      await provider.select(selecao);
      // O EngineProvider dispara 'changed'; o mock emite direto. Forçamos o
      // bump aqui também para o caso de o Engine coalescer eventos.
      setVersao((v) => v + 1);
    },
    [provider],
  );

  const limpar = useCallback(
    async (campo?: string) => {
      if (!provider) return;
      await provider.clear(campo);
      setVersao((v) => v + 1);
    },
    [provider],
  );

  const value = useMemo<QlikContextValue>(
    () => ({ provider, carregando, erro, aviso, versao, selecionar, limpar }),
    [provider, carregando, erro, aviso, versao, selecionar, limpar],
  );

  return <QlikContext.Provider value={value}>{children}</QlikContext.Provider>;
}

export function useQlik(): QlikContextValue {
  const ctx = useContext(QlikContext);
  if (!ctx) throw new Error('useQlik precisa estar dentro de <QlikProvider>');
  return ctx;
}

/* ========================================================================== */
/* Hypercube                                                                   */
/* ========================================================================== */

export interface HypercubeState<T> {
  dados: T;
  carregando: boolean;
  erro: string | null;
  /** Força nova busca sem depender de mudança de seleção. */
  recarregar: () => void;
}

/**
 * Executa um cubo e mapeia o resultado. Re-executa automaticamente quando a
 * seleção muda (via `versao`).
 *
 * O mapper entra como dependência via ref para permitir passar arrow function
 * inline sem re-disparar a query a cada render.
 */
export function useHypercube<T>(
  cube: CompiledCube,
  mapper: (matriz: QlikCell[][]) => T,
  vazio: T,
): HypercubeState<T> {
  const { provider, versao } = useQlik();
  const [dados, setDados] = useState<T>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gatilho, setGatilho] = useState(0);

  const mapperRef = useRef(mapper);
  mapperRef.current = mapper;

  useEffect(() => {
    if (!provider) return undefined;
    let vivo = true;
    setCarregando(true);

    provider
      .getHyperCubeData(cube.def)
      .then((matriz) => {
        if (!vivo) return;
        setDados(mapperRef.current(matriz));
        setErro(null);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        setErro(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });

    return () => {
      vivo = false;
    };
  }, [provider, cube, versao, gatilho]);

  const recarregar = useCallback(() => setGatilho((g) => g + 1), []);

  return { dados, carregando, erro, recarregar };
}

/* ========================================================================== */
/* Filtros globais                                                             */
/* ========================================================================== */

const CAMPO_POR_FILTRO: Record<keyof GlobalFilters, string> = {
  anoMes: 'AnoMes',
  regiao: 'RegiaoNome',
  executivo: 'ExecutivoNome',
  distribuidor: 'DistribuidorNome',
  canal: 'PDVCanal',
};

export interface FiltrosState {
  filtros: GlobalFilters;
  opcoes: Record<keyof GlobalFilters, string[]>;
  definir: (chave: keyof GlobalFilters, valor: string | null) => void;
  limparTudo: () => void;
  carregando: boolean;
}

export function useGlobalFilters(): FiltrosState {
  const { provider, selecionar, limpar, versao } = useQlik();
  const [filtros, setFiltros] = useState<GlobalFilters>(FILTROS_VAZIOS);
  const [opcoes, setOpcoes] = useState<Record<keyof GlobalFilters, string[]>>({
    anoMes: [],
    regiao: [],
    executivo: [],
    distribuidor: [],
    canal: [],
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!provider) return undefined;
    let vivo = true;

    (async () => {
      const entradas = Object.entries(CAMPO_POR_FILTRO) as Array<[keyof GlobalFilters, string]>;
      const resultados = await Promise.all(
        entradas.map(async ([chave, campo]) => [chave, await provider.getFieldValues(campo)] as const),
      );
      if (!vivo) return;
      setOpcoes(
        Object.fromEntries(resultados) as Record<keyof GlobalFilters, string[]>,
      );
      // Mês corrente é o padrão: o cockpit é sobre o mês que está correndo.
      setFiltros((atual) =>
        atual.anoMes ? atual : { ...atual, anoMes: resultados.find(([k]) => k === 'anoMes')?.[1][0] ?? null },
      );
      setCarregando(false);
    })().catch(() => {
      if (vivo) setCarregando(false);
    });

    return () => {
      vivo = false;
    };
  }, [provider, versao]);

  const definir = useCallback(
    (chave: keyof GlobalFilters, valor: string | null) => {
      setFiltros((atual) => ({ ...atual, [chave]: valor }));
      const campo = CAMPO_POR_FILTRO[chave];
      if (valor === null) void limpar(campo);
      else void selecionar({ field: campo, values: [valor] });
    },
    [limpar, selecionar],
  );

  const limparTudo = useCallback(() => {
    setFiltros((atual) => ({ ...FILTROS_VAZIOS, anoMes: atual.anoMes }));
    void limpar();
  }, [limpar]);

  return { filtros, opcoes, definir, limparTudo, carregando };
}
