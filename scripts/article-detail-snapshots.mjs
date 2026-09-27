import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

const url=process.argv[2];
if(!url || new URL(url).hostname!=='127.0.0.1')throw new Error('Pass the loopback reader URL.');
const out='uat-results/article-detail';
const references=['/Users/point/Downloads/image-gen-1(20260927-062836).png','/Users/point/Downloads/image-gen-2(20260927-062841).png'];
const browser=await launchChromium(loadPlaywright().chromium);
try {
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await page.goto(url);await page.locator('.ad-prose').waitFor();
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
  await page.mouse.move(0,0);
  const visibleImagesReady=()=>page.waitForFunction(()=>[...document.querySelectorAll('.ad-page img')].filter(img=>{
    const rect=img.getBoundingClientRect();return rect.bottom>0&&rect.top<innerHeight;
  }).every(img=>img.complete&&img.naturalWidth));
  await visibleImagesReady();await page.screenshot({path:out+'/mobile-top.png'});
  await page.locator('.ad-prose').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-82));
  await visibleImagesReady();await page.screenshot({path:out+'/mobile-reading.png'});
  await page.locator('.ar-consult').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-390));
  await visibleImagesReady();await page.screenshot({path:out+'/mobile-end.png'});
  const encode=path=>'data:image/png;base64,'+fs.readFileSync(path).toString('base64');
  const board=await browser.newPage({viewport:{width:1520,height:1000},deviceScaleFactor:1});
  const sheet=async(panels,description,path)=>{
    await board.setContent(`<html><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#f4f5f4;color:#252925;font:15px system-ui}h1{font-size:24px;margin:0 0 8px}p{margin:0 0 20px}main{display:grid;grid-template-columns:${panels.map(p=>p.width+'px').join(' ')};gap:20px;align-items:start}section{min-width:0}h2{margin:0 0 10px;font-size:18px}img{display:block;width:100%;height:auto;border:1px solid #cdd2cd}</style><h1>CoverMate / Article reader</h1><p>${description}</p><main>${panels.map(p=>`<section><h2>${p.label}</h2><img src="${encode(p.path)}"></section>`).join('')}</main></html>`);
    await board.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
    await board.screenshot({path,fullPage:true});
  };
  await sheet([{label:'Reference / supplied desktop concept',path:references[0],width:640},{label:'Development / 1440px, sample article',path:out+'/chromium-1440-th.png',width:808}],
    'Full-page comparison. Existing public shell retained. Sample article length differs from the reference; scaled proportionally.',out+'/comparison-desktop.png');
  await sheet([{label:'Reference / supplied mobile concept',path:references[1],width:392},
    {label:'Development / article header',path:out+'/mobile-top.png',width:340},
    {label:'Development / reading',path:out+'/mobile-reading.png',width:340},
    {label:'Development / related + CTA',path:out+'/mobile-end.png',width:340}],
    '390px mobile viewport at three scroll positions. Sample content, existing LINE dock/footer; contents collapses on mobile.',out+'/comparison-mobile.png');
  fs.writeFileSync(out+'/snapshot-provenance.json',JSON.stringify({url,browser:'Chromium',viewport:{width:390,height:900},data:'Local sample feed, published CMS baseline, no authentication',references:references.map(path=>({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')})),differences:'Annotated reference concept; sample content and images differ, no exact pixel-parity claim. Desktop: full-page. Mobile: top/middle/end.'},null,2));
  console.log('Captured desktop/mobile reader comparisons.');
}finally{await browser.close();}
