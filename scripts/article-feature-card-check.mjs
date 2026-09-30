import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { normalizeArticleDocument, renderArticleDocument } from '../article-document.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const paragraph = text => ({type:'paragraph',content:[{type:'text',text}]});
const feature = {type:'callout',attrs:{kind:'feature',title:'แบบเหมาจ่าย'},content:[paragraph('คุ้มครองค่ารักษาตามจริง ภายในวงเงินและเงื่อนไขของแผนที่เลือก')]};
const doc = {type:'doc',content:[feature]};
const normalized = normalizeArticleDocument(doc);
assert.deepEqual(normalized,doc,'Feature title and paragraph survive the canonical document boundary');
assert.deepEqual(normalizeArticleDocument(JSON.parse(JSON.stringify(normalized))),normalized,'JSON save/reload keeps the same authorable feature');
const rendered = renderArticleDocument(doc);
assert.match(rendered.html,/<aside class="article-callout" data-kind="feature">/);
assert.match(rendered.html,/<p class="article-callout-title">แบบเหมาจ่าย<\/p>/);
assert.ok(rendered.html.includes(feature.content[0].content[0].text),'Reader uses authored body content');
assert.equal(rendered.html.includes('<svg'),false,'Feature illustration is a fixed trusted style, not author-provided markup');
const hostile=structuredClone(doc);hostile.content[0].attrs.title='<img src=x onerror=alert(1)>';hostile.content[0].attrs.html='<script>bad</script>';hostile.content[0].content[0].content[0].text='<script>bad</script>';
const safe=renderArticleDocument(hostile);
assert.ok(safe.html.includes('&lt;img')&&safe.html.includes('&lt;script&gt;'));
assert.equal(/<script|onerror="/.test(safe.html),false);
assert.equal('html' in safe.document.content[0].attrs,false);
const invalid=structuredClone(doc);invalid.content[0].attrs.kind='feature" onclick="bad';
assert.equal(normalizeArticleDocument(invalid).content[0].attrs.kind,'note','Unknown kind is still rejected');
const untitled=structuredClone(doc);untitled.content[0].attrs.title='';
assert.equal(renderArticleDocument(untitled).html.includes('article-callout-title'),false,'Explicitly cleared title stays empty');
console.log('PASS feature card normalization, JSON round trip, semantic rendering, title clearing and HTML rejection.');

if(process.argv.includes('--browser')) {
  const out='uat-results/article-feature-card';await fs.mkdir(out,{recursive:true});
  const server=await startStaticServer({onRequest:async(req,res)=>{
    if(new URL(req.url,'http://localhost').pathname!=='/feature-card')return false;
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end(`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Article feature — local fixture</title><link rel="stylesheet" href="/assets/fonts/covermate-fonts.css"><link rel="stylesheet" href="/assets/article-document.css"><style>body{margin:0;background:#faf8f1;padding:28px 16px;font-family:'Google Sans','Google Sans Thai',sans-serif}.feature-fixture{container:covermate-article / inline-size;max-width:760px;margin:auto;background:#fffefa;padding:24px;box-sizing:border-box}h1{font-size:24px;color:#121b2b;margin:0 0 12px}.fixture-label{font-size:12px;color:#61636d}@media(max-width:767px){body{padding:16px 0}.feature-fixture{padding:16px}h1{font-size:20px}}</style><main class="feature-fixture"><p class="fixture-label">ตัวอย่างตรวจดีไซน์บน local</p><h1>ประกันสุขภาพมีกี่แบบ?</h1><div class="cm-article-prose"><p>ทำความเข้าใจรูปแบบความคุ้มครองก่อนเปรียบเทียบแผนที่สนใจ</p>${rendered.html}<p>รายละเอียดจริงขึ้นอยู่กับกรมธรรม์และเงื่อนไขของแต่ละแผน</p></div></main></html>`);return true;
  }});
  const browser=await launchChromium(loadPlaywright().chromium);
  const checks=[];
  try {
    const context=await browser.newContext({reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.fulfill({status:403,body:'Blocked'}));
    for(const width of [1100,390,320]) {
      const page=await context.newPage();await page.setViewportSize({width,height:720});await page.goto(server.baseUrl+'/feature-card');await page.evaluate(()=>document.fonts.ready);
      const geometry=await page.locator('[data-kind=feature]').evaluate(element=>{
        const card=element.getBoundingClientRect(),icon=getComputedStyle(element,'::before'),divider=getComputedStyle(element,'::after'),style=getComputedStyle(element);
        return {cardHeight:card.height,paddingLeft:parseFloat(style.paddingLeft),iconLeft:parseFloat(icon.left),iconWidth:parseFloat(icon.width),iconImage:icon.backgroundImage,dividerLeft:parseFloat(divider.left),overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.equal(geometry.overflow,false,'Feature fits the reading column');
      assert.ok(geometry.iconImage.includes('svg'),'Hospital icon actually has a rendered image');
      assert.ok(geometry.iconWidth>=48&&geometry.iconLeft+geometry.iconWidth<geometry.dividerLeft&&geometry.dividerLeft<geometry.paddingLeft,'Icon, divider and copy occupy separate columns');
      assert.ok(geometry.cardHeight>=92&&geometry.cardHeight<240,'Feature fits its authored content without an oversized frame');
      await page.locator('.feature-fixture').screenshot({path:`${out}/feature-${width}.png`});checks.push({width,...geometry});await page.close();
    }
    await fs.writeFile(`${out}/report.json`,JSON.stringify({scope:'Local rendered shared article document; no API writes',checks},null,2));
    console.log('PASS desktop/mobile feature-card layout: '+out);
  } finally {await browser.close();await new Promise(resolve=>server.server.close(resolve));}
}
