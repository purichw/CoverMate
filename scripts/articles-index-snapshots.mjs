import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

const url=process.argv[2];
if(!url || new URL(url).hostname!=='127.0.0.1')throw new Error('Pass the loopback preview URL.');
const out='uat-results/articles-index';
const referenceDesktop='/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-89778fd2-df27-4ef1-b845-e042bacc94a3.png';
const referenceMobile='/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-0109a7d7-1621-4d46-bd6a-6595df030f19.png';
const browser=await launchChromium(loadPlaywright().chromium);
try {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.goto(url);await page.locator('.ar-index').waitFor();
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
  const visibleImagesReady=()=>page.waitForFunction(()=>[...document.querySelectorAll('.ar-index img')].filter(img=>{
    const rect=img.getBoundingClientRect();return rect.bottom>0&&rect.top<innerHeight;
  }).every(img=>img.complete&&img.naturalWidth));
  await page.mouse.move(0,0);
  await visibleImagesReady();
  await page.screenshot({path:out+'/mobile-top.png'});
  await page.locator('#articles-results').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-90));
  await visibleImagesReady();
  await page.screenshot({path:out+'/mobile-list.png'});
  await page.locator('.ar-load-more').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-120));
  await visibleImagesReady();
  await page.screenshot({path:out+'/mobile-end.png'});
  const encode=path=>'data:image/png;base64,'+fs.readFileSync(path).toString('base64');
  const board=await browser.newPage({viewport:{width:1520,height:1000},deviceScaleFactor:1});
  const sheet=async(panels,description,path)=>{
    await board.setContent(`<html><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#f4f5f4;color:#252925;font:15px system-ui}h1{font-size:24px;margin:0 0 8px}p{margin:0 0 20px}main{display:grid;grid-template-columns:${panels.map(p=>p.width+'px').join(' ')};gap:20px;align-items:start}section{min-width:0}h2{margin:0 0 10px;font-size:18px}img{display:block;width:100%;height:auto;border:1px solid #cdd2cd}</style><h1>CoverMate / Articles index</h1><p>${description}</p><main>${panels.map(p=>`<section><h2>${p.label}</h2><img src="${encode(p.path)}"></section>`).join('')}</main></html>`);
    await board.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
    await board.screenshot({path,fullPage:true});
  };
  await sheet([{label:'Reference / supplied desktop concept',path:referenceDesktop,width:640},{label:'Development / 1440px, sample catalog',path:out+'/chromium-1440-th.png',width:808}],
    'Full-page comparison. New page uses the existing live header/footer; reference content and images are illustrative.',out+'/comparison-desktop.png');
  await sheet([{label:'Reference / supplied mobile concept',path:referenceMobile,width:392},
    {label:'Development / top',path:out+'/mobile-top.png',width:340},
    {label:'Development / results',path:out+'/mobile-list.png',width:340},
    {label:'Development / load more + CTA',path:out+'/mobile-end.png',width:340}],
    '390px mobile viewport at three scroll positions. Existing LINE dock and footer retained; no customer-account navigation.',out+'/comparison-mobile.png');
  fs.writeFileSync(out+'/snapshot-provenance.json',JSON.stringify({url,browser:'Chromium',viewport:{width:390,height:844},data:'local sample feed; published CMS baseline',references:[referenceDesktop,referenceMobile].map(path=>({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')})),differences:'Reference is an annotated concept, not a measured live page. Desktop comparisons scaled proportionally. Mobile uses three current viewport captures.'},null,2));
  console.log('Captured comparison-desktop.png and comparison-mobile.png');
}finally{await browser.close();}
