#!/usr/bin/env node
/**
 * Deploy dos itens mestre do PPT Tirolez para um app do Qlik Sense Cloud.
 *
 * Fonte da verdade = os JSON deste diretorio. O script e IDEMPOTENTE: procura
 * pelo id em qMetaDef.ppt_id e atualiza no lugar; so cria o que nao existe.
 * Rodar duas vezes seguidas nao duplica nada.
 *
 * Uso:
 *   export QLIK_TENANT="seu-tenant.us.qlikcloud.com"
 *   export QLIK_API_KEY="eyJhbGciOi..."
 *   node qlik/tools/deploy-master-items.mjs --app <APP_ID> [--dry-run] [--only measures]
 *
 * Dependencias:  npm i enigma.js ws
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import enigma from 'enigma.js';
import WebSocket from 'ws';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ITEMS_DIR = join(__dirname, '..', 'master-items');

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { dryRun: false, only: null, appId: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--app') args.appId = argv[i + 1];
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--only') args.only = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const TENANT = process.env.QLIK_TENANT;
const API_KEY = process.env.QLIK_API_KEY;

if (!args.appId || !TENANT || !API_KEY) {
  console.error(
    'Faltam parametros.\n' +
      '  --app <APP_ID>        (obrigatorio)\n' +
      '  QLIK_TENANT           (obrigatorio)\n' +
      '  QLIK_API_KEY          (obrigatorio)',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Conexao
// ---------------------------------------------------------------------------
async function openApp(appId) {
  // Resolve o schema pelo package instalado - nao fixar caminho de node_modules
  const schema = require('enigma.js/schemas/12.2015.0.json');

  const session = enigma.create({
    schema,
    url: `wss://${TENANT}/app/${appId}`,
    createSocket: (url) =>
      new WebSocket(url, { headers: { Authorization: `Bearer ${API_KEY}` } }),
  });

  const global = await session.open();
  const app = await global.openDoc(appId);
  return { session, app };
}

// ---------------------------------------------------------------------------
// Conversao JSON -> propriedades do Engine
// ---------------------------------------------------------------------------
function numFormat(fmt) {
  if (!fmt) return undefined;
  return {
    qType: fmt.type ?? 'F',
    qnDec: fmt.nDec ?? 2,
    qUseThou: 1,
    qFmt: fmt.fmt ?? '#.##0,00',
    qDec: ',',
    qThou: '.',
  };
}

function measureProps(m) {
  return {
    qInfo: { qType: 'measure' },
    qMeasure: {
      qLabel: m.title,
      qDef: m.expression,
      qGrouping: 'N',
      qExpressions: [],
      qActiveExpression: 0,
      qNumFormat: numFormat(m.format),
    },
    qMetaDef: {
      title: m.title,
      description: m.description ?? '',
      tags: m.tags ?? [],
      ppt_id: m.id,
    },
  };
}

function dimensionProps(d) {
  return {
    qInfo: { qType: 'dimension' },
    qDim: {
      qGrouping: d.grouping ?? 'N',
      qFieldDefs: d.fields,
      qFieldLabels: d.labels ?? d.fields,
      title: d.title,
    },
    qMetaDef: {
      title: d.title,
      description: d.description ?? '',
      tags: d.tags ?? [],
      ppt_id: d.id,
    },
  };
}

// ---------------------------------------------------------------------------
// Sincronizacao
// ---------------------------------------------------------------------------
async function listExisting(app, qType) {
  const listId = qType === 'measure' ? 'MeasureList' : 'DimensionList';
  const defKey = qType === 'measure' ? 'qMeasureListDef' : 'qDimensionListDef';
  const obj = await app.createSessionObject({
    qInfo: { qType: listId },
    [defKey]: { qType, qData: { ppt_id: '/ppt_id', title: '/title' } },
  });
  const layout = await obj.getLayout();
  const items = qType === 'measure'
    ? layout.qMeasureList.qItems
    : layout.qDimensionList.qItems;
  const byPptId = new Map();
  for (const item of items) {
    const key = item.qData?.ppt_id;
    if (key) byPptId.set(key, item.qInfo.qId);
  }
  return byPptId;
}

async function syncMeasures(app, dryRun) {
  const file = JSON.parse(await readFile(join(ITEMS_DIR, 'measures.json'), 'utf8'));
  const existing = await listExisting(app, 'measure');
  let created = 0;
  let updated = 0;

  for (const m of file.measures) {
    const props = measureProps(m);
    const id = existing.get(m.id);
    if (dryRun) {
      console.log(`  [dry-run] ${id ? 'UPDATE' : 'CREATE'}  ${m.id}  "${m.title}"`);
      continue;
    }
    if (id) {
      const handle = await app.getMeasure(id);
      await handle.setProperties({ ...props, qInfo: { qId: id, qType: 'measure' } });
      updated += 1;
    } else {
      await app.createMeasure(props);
      created += 1;
    }
  }
  return { created, updated, total: file.measures.length };
}

async function syncDimensions(app, dryRun) {
  const file = JSON.parse(await readFile(join(ITEMS_DIR, 'dimensions.json'), 'utf8'));
  const existing = await listExisting(app, 'dimension');
  let created = 0;
  let updated = 0;

  for (const d of file.dimensions) {
    const props = dimensionProps(d);
    const id = existing.get(d.id);
    if (dryRun) {
      console.log(`  [dry-run] ${id ? 'UPDATE' : 'CREATE'}  ${d.id}  "${d.title}"`);
      continue;
    }
    if (id) {
      const handle = await app.getDimension(id);
      await handle.setProperties({ ...props, qInfo: { qId: id, qType: 'dimension' } });
      updated += 1;
    } else {
      await app.createDimension(props);
      created += 1;
    }
  }
  return { created, updated, total: file.dimensions.length };
}

async function syncVariables(app, dryRun) {
  const file = JSON.parse(await readFile(join(ITEMS_DIR, 'variables.json'), 'utf8'));
  let created = 0;
  let updated = 0;

  for (const v of file.variables) {
    const props = {
      qInfo: { qType: 'variable' },
      qName: v.name,
      qDefinition: v.definition,
      qComment: v.comment ?? '',
      qMetaDef: { tags: v.tags ?? [] },
    };
    if (dryRun) {
      console.log(`  [dry-run] UPSERT  ${v.name}`);
      continue;
    }
    try {
      const handle = await app.getVariableByName(v.name);
      await handle.setProperties(props);
      updated += 1;
    } catch {
      await app.createVariableEx(props);
      created += 1;
    }
  }
  return { created, updated, total: file.variables.length };
}

/**
 * Bookmarks precisam de SELECAO ATIVA para serem criados pelo Engine: o
 * createBookmark captura o estado corrente da sessao. Por isso o fluxo e
 * aplicar a selecao, criar, e limpar.
 */
async function syncBookmarks(app, dryRun) {
  const file = JSON.parse(await readFile(join(ITEMS_DIR, 'bookmarks.json'), 'utf8'));
  let created = 0;

  for (const b of file.bookmarks) {
    if (dryRun) {
      console.log(`  [dry-run] CREATE  ${b.id}  "${b.title}"`);
      continue;
    }
    await app.clearAll();
    for (const sel of b.selections ?? []) {
      const field = await app.getField(sel.field);
      await field.selectValues(
        sel.values.map((v) =>
          typeof v === 'number'
            ? { qNumber: v, qIsNumeric: true }
            : { qText: String(v), qIsNumeric: false },
        ),
        false,
        false,
      );
    }
    await app.createBookmark({
      qInfo: { qType: 'bookmark' },
      qMetaDef: {
        title: b.title,
        description: b.description ?? '',
        ppt_id: b.id,
      },
      creationDate: new Date().toISOString(),
    });
    created += 1;
  }
  await app.clearAll();
  return { created, total: file.bookmarks.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log(`\nPPT Tirolez - deploy de itens mestre`);
  console.log(`  tenant : ${TENANT}`);
  console.log(`  app    : ${args.appId}`);
  console.log(`  modo   : ${args.dryRun ? 'DRY RUN' : 'APLICAR'}\n`);

  const { session, app } = await openApp(args.appId);

  try {
    const run = (name) => !args.only || args.only === name;

    if (run('measures')) {
      console.log('Medidas...');
      const r = await syncMeasures(app, args.dryRun);
      console.log(`  ${r.total} definidas | ${r.created} criadas | ${r.updated} atualizadas\n`);
    }
    if (run('dimensions')) {
      console.log('Dimensoes...');
      const r = await syncDimensions(app, args.dryRun);
      console.log(`  ${r.total} definidas | ${r.created} criadas | ${r.updated} atualizadas\n`);
    }
    if (run('variables')) {
      console.log('Variaveis...');
      const r = await syncVariables(app, args.dryRun);
      console.log(`  ${r.total} definidas | ${r.created} criadas | ${r.updated} atualizadas\n`);
    }
    if (run('bookmarks')) {
      console.log('Bookmarks...');
      const r = await syncBookmarks(app, args.dryRun);
      console.log(`  ${r.total} definidos | ${r.created} criados\n`);
    }

    if (!args.dryRun) {
      await app.doSave();
      console.log('App salvo.\n');
    }
  } finally {
    await session.close();
  }
})().catch((err) => {
  console.error('\nFalha no deploy:', err?.message ?? err);
  process.exit(1);
});
