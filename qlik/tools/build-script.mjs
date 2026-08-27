#!/usr/bin/env node
/**
 * Concatena as 12 abas em qlik/script/ppt-script-completo.qvs e roda um lint
 * estático antes de gravar.
 *
 * O lint existe por causa de um bug real: `LET vDataFimNum = Num(MonthEnd(Today()))`
 * guardava "46265,99999988" — com vírgula, porque LET serializa o resultado usando
 * o DecimalSep da sessão. A expansão $() injetava a vírgula no meio de uma
 * expressão e o Qlik lia como separador de argumento. A carga morria com
 * "Unexpected token: ','" a 500 linhas do início.
 *
 * Erro de expansão de dólar não aparece em revisão de código: o texto só existe
 * em tempo de execução. Por isso ele é verificado aqui, não no olho.
 *
 *   node qlik/tools/build-script.mjs [--check]
 *
 * --check apenas valida e não grava (uso em CI).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'script');
const SAIDA = join(DIR, 'ppt-script-completo.qvs');
const APENAS_CHECAR = process.argv.includes('--check');

const ABAS = [
  '00-main.qvs', '01-variaveis.qvs', '02-fontes.qvs', '03-calendario.qvs',
  '04-dimensoes.qvs', '05-hero-map.qvs', '06-fato-sellout.qvs',
  '07-agregado-hero.qvs', '08-fato-ppt-mensal.qvs', '09-oportunidades.qvs',
  '10-section-access.qvs', '99-finalize.qvs',
];

/** Funções cujo retorno pode carregar fração de hora ou separador de milhar. */
const FUNCOES_ARRISCADAS = /\b(MonthEnd|YearEnd|WeekEnd|QuarterEnd|Now|Timestamp)\s*\(/i;

const problemas = [];
const avisos = [];

function erro(arquivo, linha, msg) {
  problemas.push(`${arquivo}:${linha}  ${msg}`);
}

/** Apaga comentários de bloco e de linha preservando a numeração das linhas. */
function semComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

/** Apaga o conteúdo de strings literais, preservando o comprimento. */
function semStrings(texto) {
  return texto.replace(/'[^'\n]*'/g, (m) => `'${' '.repeat(Math.max(0, m.length - 2))}'`);
}

// ---------------------------------------------------------------------------
// Passo 1 — leitura e coleta
// ---------------------------------------------------------------------------
const conteudos = new Map();
const codigo = new Map();          // arquivo -> texto sem comentários
const declaradas = new Set();
const expandidasEmCodigo = new Map();  // variável expandida FORA de aspas
const expandidasQualquer = new Map();

for (const nome of ABAS) {
  const texto = await readFile(join(DIR, nome), 'utf8');
  conteudos.set(nome, texto);
  const limpo = semComentarios(texto);
  codigo.set(nome, limpo);

  limpo.split('\n').forEach((linha, i) => {
    const n = i + 1;
    const decl = linha.match(/^\s*(?:LET|SET)\s+(\w+)\s*=/i);
    if (decl) declaradas.add(decl[1].toLowerCase());

    for (const m of linha.matchAll(/\$\((v\w+)/g)) {
      const v = m[1].toLowerCase();
      if (!expandidasQualquer.has(v)) expandidasQualquer.set(v, `${nome}:${n}`);
    }
    // Expansão dentro de aspas é inofensiva: a vírgula fica dentro da string.
    // TRACE também é inofensivo: emite texto para o log, não é código executável.
    if (/^\s*TRACE\b/i.test(linha)) return;
    for (const m of semStrings(linha).matchAll(/\$\((v\w+)/g)) {
      const v = m[1].toLowerCase();
      if (!expandidasEmCodigo.has(v)) expandidasEmCodigo.set(v, `${nome}:${n}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Passo 2 — regras
// ---------------------------------------------------------------------------
for (const nome of ABAS) {
  const linhas = codigo.get(nome).split('\n');

  linhas.forEach((linha, i) => {
    const n = i + 1;

    // Regra 1: LET numérico expandido EM CÓDIGO precisa de formato fixo.
    // Sem isso o LET serializa com o DecimalSep da sessão (vírgula em pt-BR)
    // e a expansão injeta um separador de argumento no meio da expressão.
    const let_ = linha.match(/^\s*LET\s+(\w+)\s*=\s*(.+?);\s*$/i);
    if (let_) {
      const [, nomeVar, expr] = let_;
      const usadaEmCodigo = expandidasEmCodigo.has(nomeVar.toLowerCase());
      const temFormato = /Num\s*\([\s\S]*,\s*'[^']*'\s*\)\s*$/i.test(expr);
      const ehTexto = /^\s*(Text|Date|Timestamp|Interval)\s*\(/i.test(expr);
      if (usadaEmCodigo && FUNCOES_ARRISCADAS.test(expr) && !temFormato && !ehTexto) {
        erro(nome, n,
          `LET ${nomeVar} usa função com fração de hora e é expandida em código ` +
          `(${expandidasEmCodigo.get(nomeVar.toLowerCase())}) sem Num(...,'0'). ` +
          `A expansão vai injetar vírgula decimal e quebrar a carga.`);
      }
    }

    // Regra 2: literal decimal com vírgula fora de string.
    if (/(?<![\w')\]])\d+,\d+/.test(semStrings(linha))) {
      erro(nome, n, 'Literal numérico com vírgula decimal. Em script Qlik use ponto.');
    }
  });

  /* Regra 3: INLINE com decimal em ponto e sem Num# explícito, POR COLUNA.
     O INLINE é interpretado com o DecimalSep da sessão. Em pt-BR '34.90' não é
     número (ponto é separador de milhar), vira TEXTO, e coage para zero na
     primeira conta — sem erro. Foi assim que todo ValorSellOut zerou.

     A checagem é por COLUNA, não por statement: basta uma coluna decimal ficar
     sem Num# para o campo zerar, mesmo que as vizinhas estejam protegidas.

     Posição absoluta, não texto de linha: `LOAD * INLINE [` aparece em vários
     lugares do arquivo. Para achar o statement que abre o INLINE, sobe-se até o
     rótulo da tabela, incluindo assim a carga precedente. */
  const textoArquivo = codigo.get(nome);
  const linhasArquivo = textoArquivo.split('\n');
  const reInline = /INLINE\s*\[([\s\S]*?)\];/gi;
  const ehDecimalPonto = (v) => /^-?\d+\.\d+$/.test(v.trim());
  let achado;

  while ((achado = reInline.exec(textoArquivo)) !== null) {
    const linhasBloco = achado[1].split('\n').map((l) => l.trim()).filter(Boolean);
    if (linhasBloco.length < 2) continue;

    const colunas = linhasBloco[0].split(',').map((c) => c.trim());
    const comDecimal = new Set();
    for (const linhaDados of linhasBloco.slice(1)) {
      linhaDados.split(',').forEach((valor, idx) => {
        if (ehDecimalPonto(valor) && colunas[idx]) comDecimal.add(colunas[idx]);
      });
    }
    if (comDecimal.size === 0) continue;

    const linhaInline = textoArquivo.slice(0, achado.index).split('\n').length;
    const contexto = [];
    for (let k = linhaInline - 1; k >= 0 && linhaInline - k <= 60; k -= 1) {
      const l = linhasArquivo[k] ?? '';
      contexto.push(l);
      if (/^\s*[A-Za-z_%][\w.]*:\s*$/.test(l)) break;   // rótulo da tabela
    }
    const statement = contexto.join('\n');

    for (const coluna of comDecimal) {
      const protegida = new RegExp(`Num#\\s*\\(\\s*${coluna}\\b`, 'i').test(statement);
      if (!protegida) {
        erro(nome, linhaInline,
          `INLINE: coluna "${coluna}" tem decimal em ponto e nao passa por ` +
          `Num#(${coluna}, formato, '.', ','). O DecimalSep da sessao le o valor ` +
          'como texto e ele coage para zero em silencio.');
      }
    }
  }

  // Regra 4: IF / END IF balanceados por arquivo.
  const limpo = codigo.get(nome);
  const ifs = (limpo.match(/^\s*IF\b[^\n]*\bTHEN\b/gim) ?? []).length;
  const endifs = (limpo.match(/^\s*END\s+IF\s*;/gim) ?? []).length;
  if (ifs !== endifs) erro(nome, 0, `IF (${ifs}) e END IF (${endifs}) desbalanceados.`);
}

// Regra 5: expansão de variável nunca declarada.
for (const [v, origem] of expandidasQualquer) {
  if (!declaradas.has(v)) avisos.push(`${origem}  $(${v}) expandida mas nunca declarada.`);
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------
if (avisos.length) {
  console.log('\nAvisos:');
  for (const a of avisos) console.log(`  - ${a}`);
}

if (problemas.length) {
  console.error(`\n${problemas.length} problema(s) bloqueante(s):`);
  for (const p of problemas) console.error(`  ✗ ${p}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Concatenação
// ---------------------------------------------------------------------------
const CABECALHO = `///$tab 00 - Main
/* =============================================================================
   PPT - PROGRAMA POR PERFORMANCE TIROLEZ
   SCRIPT COMPLETO EM ARQUIVO UNICO
   -----------------------------------------------------------------------------
   GERADO POR qlik/tools/build-script.mjs - NAO EDITE ESTE ARQUIVO.
   A fonte da verdade sao os 12 .qvs individuais em qlik/script/.

   COMO USAR
   1. Qlik Cloud > o app > Preparar > Editor de carregamento de dados
   2. Selecione TUDO na aba Main (Ctrl+A) e cole este conteudo por cima
   3. Salvar > Carregar dados

   As linhas '///$tab NOME' sao a marcacao de aba do Qlik. Elas sao comentario
   para o interpretador: o script roda igual em uma aba so. Ao reabrir o editor
   depois de salvar, o Qlik normalmente re-divide o texto nessas 12 abas.

   MODO PADRAO: vUseMockData = 1 -> gera base sintetica, nao precisa de nenhuma
   conexao. Para producao, ajuste as variaveis na secao "01 - Variaveis".
   ============================================================================= */

`;

const partes = ABAS.map((nome, i) => {
  let txt = conteudos.get(nome).trimEnd() + '\n';
  if (i === 0) txt = txt.replace(/^\/\/\/\$tab [^\n]*\n/, '');
  return txt;
});

const separador = `\n\n/* ${'='.repeat(74)} */\n\n`;
const saida = CABECALHO + partes.join(separador);

if (APENAS_CHECAR) {
  const atual = await readFile(SAIDA, 'utf8').catch(() => '');
  if (atual !== saida) {
    console.error('\n✗ ppt-script-completo.qvs está desatualizado. Rode: node qlik/tools/build-script.mjs');
    process.exit(1);
  }
  console.log('\n✓ Lint OK e arquivo combinado atualizado.');
} else {
  await writeFile(SAIDA, saida, 'utf8');
  const abas = [...saida.matchAll(/^\/\/\/\$tab (.+)$/gm)].map((m) => m[1]);
  console.log(`\n✓ Lint OK`);
  console.log(`✓ ${SAIDA.split('/').slice(-1)[0]} — ${abas.length} abas, ` +
              `${saida.split('\n').length} linhas, ${(saida.length / 1024).toFixed(1)} KB`);
}
