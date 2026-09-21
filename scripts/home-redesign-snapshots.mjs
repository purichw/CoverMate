import fs from 'node:fs';
import path from 'node:path';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const baseUrl = process.argv[2] || 'http://127.0.0.1:58081/';
if (!['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname)) throw Error('Local preview only.');
const out = path.resolve('uat-results/home-redesign');
fs.mkdirSync(out,{recursive:true});
const browser = await launchChromium(loadPlaywright().chromium);
const report = { timestamp:new Date().toISOString(), baseUrl, environment:'local read-only proposed CMS fixture', browser:browser.version(), captures:[], errors:[] };
try {
  for (const lang of ['th','en']) for (const [width,height] of [[390,844],[820,1180],[1440,900]]) {
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
    page.on('pageerror', error=>report.errors.push(error.message));
    await page.goto(baseUrl);
    await page.locator('.hm-cover-card').first().waitFor();
    await page.locator(`[data-language-switch="${lang}"]`).first().click();
    await page.evaluate(async()=>{await document.fonts.ready;for(const image of document.images){image.loading='eager';await image.decode().catch(()=>{});}});
    await page.waitForTimeout(500);
    const name=`review-${lang}-${width}`;
    const full=path.join(out,name+'-full.png');
    await page.screenshot({path:full,fullPage:true});
    const geometry=await page.evaluate(()=>({height:document.documentElement.scrollHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...document.images].filter(el=>el.closest('main')).map(el=>({src:el.getAttribute('src'),loaded:el.complete&&el.naturalWidth>0})),sections:[...document.querySelectorAll('main section')].map(el=>({id:el.id,height:Math.round(el.getBoundingClientRect().height)}))}));
    report.captures.push({lang,viewport:{width,height},full,geometry,visuallyInspected:false});
    for (const [region,selector] of [['top','#hero'],['advisory','#about'],['motor','#insurers'],['tiers','#tiers'],['contact','#talk'],['knowledge','#faq'],['footer','footer']]) {
      if(width===820 && !['top','tiers','footer'].includes(region)) continue;
      await page.evaluate(selector=>scrollTo(0,document.querySelector(selector).getBoundingClientRect().top+scrollY-document.querySelector('header').getBoundingClientRect().height-12),selector);
      await page.waitForTimeout(450);
      await page.screenshot({path:path.join(out,name+'-'+region+'.png')});
    }
    await page.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out,'snapshot-provenance.json'),JSON.stringify(report,null,2));
}
console.log(report.captures.map(c=>({lang:c.lang,width:c.viewport.width,height:c.geometry.height,overflow:c.geometry.scrollWidth>c.geometry.width})));
if(report.errors.length) throw Error(report.errors.join('\n'));
