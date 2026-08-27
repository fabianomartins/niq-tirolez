'use client';

import { useMemo } from 'react';
import { useHypercube } from './useQlik';
import {
  CUBE_EVOLUCAO,
  CUBE_HERO_MATRIX,
  CUBE_HERO_RECOMENDACOES,
  CUBE_MAPA,
  CUBE_OPP_POSITIVACAO,
  CUBE_OPP_RECUPERACAO,
  CUBE_SUMMARY,
} from '@/services/hypercubes/definitions';
import {
  consolidarSummary,
  mapDistribuidores,
  mapEvolucao,
  mapHeroMatrix,
  mapMapa,
  mapOportunidadePositivacao,
  mapOportunidadeRecuperacao,
  mapRecomendacoesHero,
  mapSummary,
} from '@/services/hypercubes/mappers';
import { gerarInsights } from '@/services/insights/engine';
import type {
  DistribuidorRow,
  EvolucaoPonto,
  HeroMatrixRow,
  Insight,
  OportunidadePositivacao,
  OportunidadeRecuperacao,
  PptSummary,
  RecomendacaoHero,
} from '@/types/ppt';

const VAZIO_SUMMARY: PptSummary[] = [];
const VAZIO_EVOLUCAO: EvolucaoPonto[] = [];
const VAZIO_POS: OportunidadePositivacao[] = [];
const VAZIO_REC: OportunidadeRecuperacao[] = [];
const VAZIO_HERO: HeroMatrixRow[] = [];
const VAZIO_RECO: RecomendacaoHero[] = [];
const VAZIO_DIST: DistribuidorRow[] = [];

/** Resumo consolidado do contexto atual — alimenta os KPI cards. */
export function usePptResumo() {
  const { dados, carregando, erro } = useHypercube(CUBE_SUMMARY, mapSummary, VAZIO_SUMMARY);
  const resumo = useMemo(() => consolidarSummary(dados), [dados]);
  return { resumo, linhas: dados, carregando, erro };
}

export function usePptEvolucao() {
  return useHypercube(CUBE_EVOLUCAO, mapEvolucao, VAZIO_EVOLUCAO);
}

export function usePptDistribuidores() {
  return useHypercube(CUBE_SUMMARY, mapDistribuidores, VAZIO_DIST);
}

export function useOportunidadesPositivacao() {
  return useHypercube(CUBE_OPP_POSITIVACAO, mapOportunidadePositivacao, VAZIO_POS);
}

export function useOportunidadesRecuperacao() {
  return useHypercube(CUBE_OPP_RECUPERACAO, mapOportunidadeRecuperacao, VAZIO_REC);
}

export function useHeroMatrix() {
  return useHypercube(CUBE_HERO_MATRIX, mapHeroMatrix, VAZIO_HERO);
}

export function useRecomendacoesHero() {
  return useHypercube(CUBE_HERO_RECOMENDACOES, mapRecomendacoesHero, VAZIO_RECO);
}

export function useMapaExecutivo() {
  return useHypercube(CUBE_MAPA, mapMapa, VAZIO_DIST);
}

/**
 * Motor de insights ligado aos cubos.
 *
 * Consulta os quatro cubos que alimentam as regras. Em telas que já carregam
 * parte deles, o cache de objeto de sessão do EngineProvider evita recálculo —
 * o Engine devolve o layout já materializado.
 */
export function useInsights(limite = 5): { insights: Insight[]; carregando: boolean } {
  const { resumo, carregando: c1 } = usePptResumo();
  const { dados: pos, carregando: c2 } = useOportunidadesPositivacao();
  const { dados: hero, carregando: c3 } = useRecomendacoesHero();
  const { dados: rec, carregando: c4 } = useOportunidadesRecuperacao();

  const insights = useMemo(
    () =>
      gerarInsights(
        {
          resumo,
          oportunidadesPositivacao: pos,
          oportunidadesHero: hero,
          oportunidadesRecuperacao: rec,
        },
        limite,
      ),
    [resumo, pos, hero, rec, limite],
  );

  return { insights, carregando: c1 || c2 || c3 || c4 };
}
