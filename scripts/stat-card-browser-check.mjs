import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { firebaseMock, createLegacyOpsState } from './fixtures/ops-portal.mjs';
import { adminArticleFixture } from './fixtures/home-articles/admin-feed.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import C from '../server/cases-contract.cjs';

const output = path.resolve('uat-results/stat-cards');
fs.mkdirSync(output, { recursive:true });
const { server, baseUrl } = await startStaticServer();
const browser = await launchChromium(loadPlaywright().chromium);
const legacy = createLegacyOpsState(), errors = [], measures = [];
const now = new Date().toISOString();
let baseline = false;
try {
  const context = await browser.newContext({ viewport:{width:1440,height:1000} });
  await context.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({firebase:true,uid:'smoke-admin',name:'Local QA',role:'admin',email:'owner@example.test',exp:Date.now()+3600000})));
  await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl && route.request().method() === 'GET' ? route.continue() : route.abort());
  await context.route('**/covermate-firebase.js', route => route.fulfill({contentType:'text/javascript',body:firebaseMock}));
  await context.route('**/admin/stat-card.css', route => baseline ? route.fulfill({contentType:'text/css',body:''}) : route.continue());
  await context.route('**/api/ops/**', route => {
    const url = new URL(route.request().url()), resource = url.pathname.replace('/api/ops/','');
    const data = resource === 'cases/summary' ? C.summary([],now) : resource === 'cases' ? C.listCases([],url.searchParams,now) : resource === 'notifications' ? {items:[],unreadCount:0,nextCursor:null} : {rows:legacy[resource] || [],total:legacy[resource]?.length || 0};
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await context.route('**/api/articles?*', route => route.fulfill({contentType:'application/json',body:JSON.stringify(adminArticleFixture)}));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  async function ready(module) {
    await page.goto(baseUrl+'/admin#'+module);
    await page.waitForFunction(id => document.body.dataset.boot === 'ready' && document.body.dataset.module === id,module);
    if(module==='operations') await page.locator('.case-list[aria-busy="false"]').waitFor();
    if(module==='articles') await page.locator('[data-article-state="ready"]').waitFor();
    if(module==='analytics') await page.locator('.admin-analytics[data-analytics-state="ready"],.admin-analytics[data-analytics-state="empty"]').waitFor();
    await page.evaluate(()=>document.fonts.ready);
  }
  async function capture(file,selector) {
    const box = await page.locator(selector).boundingBox(), viewport = page.viewportSize();
    await page.screenshot({path:path.join(output,file),animations:'disabled',clip:{x:Math.max(0,box.x-16),y:Math.max(0,box.y-24),width:Math.min(viewport.width,box.width+32),height:box.height+48}});
  }
  baseline=true;await ready('operations');await capture('cases-before.png','.case-metrics');baseline=false;
  await page.reload();
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1000});
    for(const module of ['operations','articles','analytics']) {
      await ready(module);
      const cards = await page.locator('.cm-stat-card').evaluateAll(elements=>elements.map(el=>{
        const css=getComputedStyle(el),r=el.getBoundingClientRect();
        const children=[...el.children].flatMap(child=>getComputedStyle(child).display==='contents'?[...child.children]:[child]).filter(child=>child.getClientRects().length);
        const boxes=children.map(child=>child.getBoundingClientRect());
        return {text:el.textContent.trim(),align:css.textAlign,vertical:css.justifyContent,horizontal:css.alignItems,overflow:el.scrollWidth>el.clientWidth+1,
          xOffsets:boxes.map(b=>Math.abs(b.x+b.width/2-r.x-r.width/2)),yOffset:Math.abs((Math.min(...boxes.map(b=>b.y))+Math.max(...boxes.map(b=>b.bottom)))/2-r.y-r.height/2)};
      }));
      assert.ok(cards.length>0,module+' has actual stat cards');
      for(const card of cards) {
        assert.equal(card.align,'center',`${module} at ${width}px: text`);assert.equal(card.vertical,'center');assert.equal(card.horizontal,'center');
        assert.equal(card.overflow,false);assert.ok(card.xOffsets.every(value=>value<1),module+' horizontal center');assert.ok(card.yOffset<2,module+' vertical center');
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),module+' viewport fits');
      measures.push({width,module,cards});
      if(width!==320) await capture(`${module}-${width}.png`,module==='operations'?'.case-metrics':module==='articles'?'.article-summary':'.analytics-kpis');
      if(module==='operations') {await page.locator('[data-metric="new"]').click();await page.waitForFunction(()=>document.querySelector('#caseStatusFilter')?.value==='new');}
    }
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,environment:'Local fixtures; external requests and writes blocked',measures},null,2));
  console.log('PASS: centered stat cards at 1440/390/320px across cases, articles and Analytics; no overflow; case metric filter still works.');
} finally {
  await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
