// npm install --no-save playwright@1.62.1
// npx playwright install chromium
// node tests/browser.cjs
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.md': 'text/plain' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  fs.readFile(file, (error, data) => {
    response.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    response.end(error ? 'Not found' : data);
  });
});
let browser;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => { Math.random = () => .9; });
  await page.goto(base);
  await page.locator('#start').click();
  await page.locator('#condition').selectOption('0');
  const box = await page.locator('#range').boundingBox();
  const target = (x = .5, y = .46) => ({ x: box.x + box.width * x, y: box.y + box.height * y });
  const center = target();
  await page.mouse.click(center.x, center.y);
  assert.equal(await page.locator('#magazine').innerText(), '11');
  assert.equal(await page.locator('#hits').innerText(), '01');
  assert.equal(await page.locator('#accuracy').innerText(), '100%');
  await page.locator('#reload').click();
  await page.waitForFunction(() => document.getElementById('state').textContent.startsWith('RELOADING'));
  await page.mouse.click(center.x, center.y);
  assert.equal(await page.locator('#shots').innerText(), '01', 'Firing was accepted during reload');
  await page.waitForFunction(() => document.getElementById('magazine').textContent === '12');
  assert.equal(await page.locator('#reserve').innerText(), '59');
  await page.locator('#jam').click();
  await page.keyboard.press('r');
  assert.ok((await page.locator('#state').innerText()).startsWith('STOPPAGE'), 'Reload cleared a jam');
  await page.mouse.click(center.x, center.y);
  assert.equal(await page.locator('#magazine').innerText(), '12', 'Jam spent ammunition');
  await page.locator('#clear').click();
  await page.waitForFunction(() => document.getElementById('state').textContent.startsWith('CLEARING'));
  await page.mouse.click(center.x, center.y);
  assert.equal(await page.locator('#shots').innerText(), '01', 'Firing was accepted during clear');
  await page.waitForFunction(() => document.getElementById('state').textContent.startsWith('READY'));
  // Hold fire through a magazine, then prove pointer release cannot leak fire.
  await page.mouse.move(center.x, center.y); await page.mouse.down();
  await page.waitForFunction(() => document.getElementById('magazine').textContent === '00');
  await page.mouse.up();
  assert.equal(await page.locator('#shots').innerText(), '13');
  await page.locator('#reload').click();
  await page.waitForFunction(() => document.getElementById('magazine').textContent === '12');
  const afterRelease = await page.locator('#shots').innerText();
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#shots').innerText(), afterRelease, 'Held input leaked after release');
  await page.keyboard.press('t');
  assert.equal(await page.locator('#shots').innerText(), '00', 'Keyboard reset after button focus failed');
  assert.equal(await page.locator('#reserve').innerText(), '60');
  // Natural random jam path, separate from the explicit practice button.
  await page.locator('#condition').selectOption('0.18');
  await page.evaluate(() => { Math.random = () => 0; });
  await page.mouse.click(center.x, center.y);
  assert.ok((await page.locator('#state').innerText()).startsWith('STOPPAGE'));
  assert.equal(await page.locator('#shots').innerText(), '00');
  await page.evaluate(() => { Math.random = () => .9; });
  await page.locator('#condition').selectOption('0.06');
  for (const x of [.17, .5, .83]) {
    const point = target(x); await page.mouse.click(point.x, point.y); await page.waitForTimeout(180);
  }
  assert.equal(await page.locator('#hits').innerText(), '03');
  assert.equal(await page.locator('#magazine').innerText(), '09');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Desktop horizontal overflow');
  fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'test-results/desktop.png'), fullPage: true });
  if (process.env.PREVIEW_TO_LOG === '1') {
    const preview = (await page.screenshot({ type: 'jpeg', quality: 35 })).toString('base64');
    console.log('BREACHLINE_PREVIEW_START');
    for (let i = 0; i < preview.length; i += 3000) console.log('BREACHLINE_PREVIEW_CHUNK=' + preview.slice(i, i + 3000));
    console.log('BREACHLINE_PREVIEW_END');
  }
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await mobile.newPage(); m.on('pageerror', error => errors.push(error.message));
  await m.addInitScript(() => { Math.random = () => .9; });
  await m.goto(base); await m.locator('#start').tap();
  assert.equal(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile horizontal overflow');
  const mb = await m.locator('#range').boundingBox();
  await m.touchscreen.tap(mb.x + mb.width * .5, mb.y + mb.height * .46);
  assert.equal(await m.locator('#hits').innerText(), '01', 'Touch target failed');
  await m.locator('#jam').tap(); await m.locator('#clear').tap();
  await m.waitForFunction(() => document.getElementById('state').textContent.startsWith('READY'));
  await m.screenshot({ path: path.join(root, 'test-results/mobile.png'), fullPage: true });
  const reduced = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const r = await reduced.newPage(); await r.goto(base); await r.locator('#start').click();
  await r.locator('#sound').click(); assert.equal(await r.locator('#sound').getAttribute('aria-pressed'), 'true');
  await r.locator('#sound').click(); assert.equal(await r.locator('#sound').getAttribute('aria-pressed'), 'false');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('PASS desktop: hit detection, reload lock, jam/reload lock, clear lock, automatic fire, input release, keyboard reset, random stoppage, screenshots');
  console.log('PASS mobile: no horizontal overflow, touch hit, jam/clear, screenshot');
  console.log('PASS reduced motion and audio toggle; no browser runtime errors');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); server.close();
});
