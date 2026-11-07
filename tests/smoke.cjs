/**
 * Browser smoke test: opens every route of the built app (vite preview) in Chromium and fails on
 * uncaught errors, console errors or missing key elements.
 *
 *   npm run build && npm run test:smoke
 */
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const ROUTES = [
  ['#/', 'h1'],
  ['#/atlas', '.results li a'],
  ['#/atlas?themes=drones', '.results li a'],
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
];

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
    await browser.close();
  } finally {
    server.kill();
  }
  if (failed) { console.error(`\n${failed} route(s) failed`); process.exit(1); }
  console.log('\nall routes ok');
})();
