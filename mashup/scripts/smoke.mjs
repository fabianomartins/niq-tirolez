/**
 * Smoke test de navegação.
 *
 * Sobe o browser, percorre as seis telas do cockpit e falha se qualquer uma
 * lançar erro de runtime, registrar erro no console ou renderizar vazia.
 * Roda contra a build de produção em modo mock — sem tenant, sem dado real.
 *
 *   npm run build && npm start &
 *   node scripts/smoke.mjs [--url http://localhost:3000] [--screenshots ./out]
 */

import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const arg = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};

const BASE = arg('--url', 'http://localhost:3000');
const DIR = arg('--screenshots', null);

const ROTAS = [
  { rota: '/overview', esperado: 'Overview PPT' },
  { rota: '/positivacao', esperado: 'Oportunidades de Positivação' },
  { rota: '/mix-hero', esperado: 'Mix Hero Navigator' },
  { rota: '/oportunidades-hero', esperado: 'Oportunidades Hero' },
  { rota: '/recuperacao', esperado: 'Potencial de Recuperação' },
  { rota: '/executivo', esperado: 'Visão Executivo' },
];

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

const problemas = [];
page.on('pageerror', (e) => problemas.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problemas.push(`console: ${m.text().slice(0, 240)}`);
});

if (DIR) await mkdir(DIR, { recursive: true });

for (const { rota, esperado } of ROTAS) {
  await page.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const texto = await page.locator('main').innerText();

  if (!texto.includes(esperado)) problemas.push(`${rota}: título "${esperado}" não encontrado`);
  if (texto.length < 400) problemas.push(`${rota}: conteúdo suspeito de vazio (${texto.length} chars)`);

  if (DIR) await page.screenshot({ path: `${DIR}/${rota.slice(1)}.png` });
  console.log(`  ${rota.padEnd(24)} ${texto.length} chars`);
}

await browser.close();

if (problemas.length > 0) {
  console.error('\nSMOKE FALHOU:');
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nSMOKE OK — 6 telas renderizadas sem erro de runtime.');
