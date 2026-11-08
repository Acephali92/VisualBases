/**
 * Browser smoke test: opens every route of the built app (vite preview) in Chromium and fails on
 * uncaught errors, console errors or missing key elements, and checks the main pages with axe-core
 * (WCAG 2.1 A/AA).
 *
 *   npm run build && npm run test:smoke
 */
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const fs = require('node:fs');
const path = require('node:path');

const PORT = 4179;
/** recorded Nominatim answers (src/lib/fixtures/nominatim) – the smoke test never calls the live service */
const FIXTURES = path.join(__dirname, '../src/lib/fixtures/nominatim');
const fixture = (name) => fs.readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8');
const BASE = `http://localhost:${PORT}/`;
const ROUTES = [
  ['#/', 'h1'],
  ['#/atlas', '.results li a'],
  ['#/atlas?themes=drones', '.results li a'],
  ['#/atlas?kinds=closed&themes=drones', '.results li a'],
  ['#/atlas?status=closed&activities=defender-europe', '.meta-row'],
  ['#/base/naval-radio-transmitter-lualualei', '.profile h2'],
  ['#/base/base-aerienne-188-djibouti', '.profile .box'],
  ['#/base/buechel-nato-air-base', '.profile .chips'],
  ['#/base/ramstein-air-base', '.profile h2'],
  ['#/near', 'form.finder'],
  ['#/news', '.news li'],
  ['#/stats', '.chart'],
  ['#/act', '.camps li'],
  ['#/quiz', '.opt'],
  ['#/space', '.compare'],
  ['#/school', '.task'],
  ['#/about', '.kinds'],
  ['#/embed?themes=resistance', '.badge'],
  ['b/ramstein-air-base.html', '.profile h2'],
  ['c/DE.html', '.country h2'],
  ['c/GL.html', '.country h2'],
];

/** pages checked with axe-core against WCAG 2.1 A/AA – any violation fails the test */
const AXE_ROUTES = ['#/', '#/atlas', '#/base/ramstein-air-base', '#/near', '#/news', '#/stats', '#/act', '#/quiz', '#/space', '#/school', '#/about', 'b/ramstein-air-base.html', 'c/DE.html'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function axeChecks(browser) {
  const source = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  let failed = 0;
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    for (const route of AXE_ROUTES) {
      const page = await browser.newPage({ viewport });
      await page.goto(BASE + route, { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      await page.addScriptTag({ content: source });
      const violations = await page.evaluate(async (tags) => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
        return r.violations.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
      }, AXE_TAGS);
      if (violations.length) failed++;
      console.log(`${violations.length ? '✘' : '✔'} axe ${viewport.width}px ${route}${violations.length ? '\n    ' + violations.join('\n    ') : ''}`);
      await page.close();
    }
  }
  return failed;
}

/**
 * "Your base" (#/near) end to end, desktop and mobile, with Nominatim answered from fixtures:
 * ambiguous postcode → choice → resolved place shown → results sorted by the computed distance;
 * international postcode; rate limit and empty answer are explained.
 */
async function nearFlows() {
  let failed = 0;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const answer = (u) => {
    const p = u.searchParams;
    const pc = p.get('postalcode');
    const cc = p.get('countrycodes');
    if (pc === '56068') return { body: fixture(cc === 'de' ? 'postcode-56068-de' : 'postcode-56068-any') };
    if (pc === 'SW1A 1AA') return { body: fixture('postcode-sw1a1aa-gb') };
    if (pc === '11111') return { status: 429, body: '{}' };
    return { body: fixture('postcode-99999x-any') };
  };
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    const requests = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
    await page.route('https://nominatim.openstreetmap.org/**', (route) => {
      const u = new URL(route.request().url());
      requests.push(u.search);
      const a = answer(u);
      return route.fulfill({ status: a.status ?? 200, contentType: 'application/json', body: a.body });
    });
    const step = async (name, fn) => {
      try { await fn(); } catch (e) { errors.push(`${name}: ${e.message.split('\n')[0]}`); }
    };
    const searchFor = async (text) => {
      await page.fill('form.finder input[name=place]', text);
      await page.click('form.finder button[type=submit]');
    };
    await page.goto(BASE + '#/near', { waitUntil: 'load' });
    await page.waitForSelector('form.finder');

    await step('ambiguous postcode', async () => {
      await searchFor('56068');
      await page.waitForSelector('.choose .choice', { timeout: 10000 });
      const choices = await page.$$eval('.choose .choice', (els) => els.map((e) => e.textContent));
      if (!choices.some((c) => /Koblenz/.test(c)) || !choices.some((c) => /Minnesota/.test(c))) throw new Error(`choices: ${choices.join(' | ')}`);
      if (await page.$('.ranking')) throw new Error('distances shown before a place was chosen');
      await page.click('.choose .choice:has-text("Koblenz")');
      await page.waitForSelector('.ranking li', { timeout: 10000 });
    });
    await step('resolved place shown', async () => {
      const where = await page.textContent('.where');
      if (!/Koblenz/.test(where) || !/Rheinland-Pfalz/.test(where) || !/56068/.test(where)) throw new Error(`position card: ${where}`);
      await page.click('.where details.more summary');
      const coords = await page.textContent('.where dd.num');
      if (!/50\.3533° N, 7\.5949° (O|E)/.test(coords)) throw new Error(`coordinates: ${coords}`);
    });
    await step('ranking sorted, rank 1 = Büchel', async () => {
      const rows = await page.$$eval('.ranking li', (els) => els.map((e) => ({ id: e.dataset.id, km: Number(e.dataset.km), shown: e.querySelector('.d .v').textContent })));
      if (rows.length < 5) throw new Error(`only ${rows.length} results`);
      for (let i = 1; i < rows.length; i++) if (rows[i].km < rows[i - 1].km) throw new Error(`order: ${rows[i - 1].id} ${rows[i - 1].km} > ${rows[i].id} ${rows[i].km}`);
      if (rows[0].id !== 'buechel-nato-air-base') throw new Error(`rank 1 is ${rows[0].id}`);
      if (Math.round(rows[0].km) !== Number(rows[0].shown)) throw new Error(`shown ${rows[0].shown} ≠ computed ${rows[0].km}`);
      const big = await page.textContent('.big .km');
      if (!big.includes(rows[0].shown)) throw new Error(`headline ${big}`);
    });
    await step('international postcode (GB)', async () => {
      await page.selectOption('form.finder select[name=country]', 'GB');
      await searchFor('SW1A 1AA');
      await page.waitForFunction(() => /Westminster/.test(document.querySelector('.where')?.textContent ?? ''), null, { timeout: 10000 });
      const top = await page.getAttribute('.ranking li:first-child', 'data-id');
      if (top !== 'raf-blenheim-crescent') throw new Error(`rank 1 from London is ${top}`);
      await page.selectOption('form.finder select[name=country]', '');
    });
    await step('rate limit explained, no stale result', async () => {
      await searchFor('11111');
      await page.waitForSelector('.error', { timeout: 10000 });
      const msg = await page.textContent('.error');
      if (!/ausgelastet|busy/.test(msg)) throw new Error(`message: ${msg}`);
      if (await page.$('.ranking')) throw new Error('old result still shown after an error');
    });
    await step('not found explained', async () => {
      await searchFor('99999X');
      await page.waitForFunction(() => /nicht gefunden|kein Ort|No place/.test(document.querySelector('.error')?.textContent ?? ''), null, { timeout: 10000 });
    });
    await step('no horizontal overflow', async () => {
      await searchFor('DE-56068');
      await page.waitForSelector('.ranking li', { timeout: 10000 });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) throw new Error(`page is ${over}px wider than the viewport`);
    });
    const ok = errors.length === 0;
    if (!ok) failed++;
    console.log(`${ok ? '✔' : '✘'} ${viewport.width}px #/near flow (${requests.length} geocoder requests)${ok ? '' : '\n    ' + errors.join('\n    ')}`);
    await page.close();
  }
  await browser.close();
  return failed;
}

(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  let failed = 0;
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(BASE)).ok) break; } catch { /* starting */ }
      await new Promise((r) => setTimeout(r, 200));
    }
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      for (const [route, selector] of ROUTES) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
        page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
        await page.goto(BASE + route, { waitUntil: 'load' });
        try { await page.waitForSelector(selector, { timeout: 15000 }); } catch { errors.push(`missing ${selector}`); }
        await page.waitForTimeout(800);
        const ok = errors.length === 0;
        if (!ok) failed++;
        console.log(`${ok ? '✔' : '✘'} ${viewport.width}px ${route}${ok ? '' : '\n    ' + errors.join('\n    ')}`);
        await page.close();
      }
    }
    failed += await axeChecks(browser);
    await browser.close();

    // without WebGL the map must degrade to a notice while lists and profiles keep working
    const noGl = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
    for (const [route, selector] of [['#/', 'h1'], ['#/atlas', '.results li a'], ['#/base/ramstein-air-base', '.profile h2'], ['#/embed', '.badge']]) {
      const page = await noGl.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      await page.goto(BASE + route, { waitUntil: 'load' });
      try { await page.waitForSelector(selector, { timeout: 15000 }); } catch { errors.push(`missing ${selector}`); }
      try { await page.waitForSelector('.notice', { timeout: 15000 }); } catch { errors.push('missing map notice'); }
      const ok = errors.length === 0;
      if (!ok) failed++;
      console.log(`${ok ? '✔' : '✘'} no-WebGL ${route}${ok ? '' : '\n    ' + errors.join('\n    ')}`);
      await page.close();
    }
    await noGl.close();

    failed += await nearFlows();
  } finally {
    server.kill();
  }
  if (failed) { console.error(`\n${failed} route(s) failed`); process.exit(1); }
  console.log('\nall routes ok');
})();
