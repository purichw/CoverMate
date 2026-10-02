import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launchChromium,loadPlaywright} from './lib/playwright.mjs';
import {loadUatLocalEnv,vercelBypassHeaders} from './lib/uat-env.mjs';

// Hosted readback only: no sign-in, publishing, settings or content writes.
loadUatLocalEnv();
const origin=new URL(process.env.COVERMATE_URL||'https://covermateinsurance.com').origin;
assert.match(origin,/^https:\/\/(?:covermateinsurance\.com|covermate-[a-z0-9-]+\.vercel\.app)$/);
const production=origin==='https://covermateinsurance.com';
const headers=production?{}:vercelBypassHeaders();
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out='uat-results/article-release/'+(production?'production':'preview');
fs.mkdirSync(out,{recursive:true});
const report={origin,sha,at:new Date().toISOString(),writes:0,assets:[],routes:[],captures:[],passed:false};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const path of ['/article-media.mjs','/article-image-assets.mjs','/admin/articles/lifecycle.mjs','/admin/articles/editor.js','/assets/visitor/article-reader.js','/assets/visitor/articles-index.css','/assets/visitor/article-detail.css','/assets/visitor/home.css']){
  const response=await fetch(origin+path+'?release='+sha,{headers});
  assert.equal(response.status,200,path);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(hash(bytes),hash(fs.readFileSync('.'+path)),path+' must match the candidate');
  report.assets.push({path,bytes:bytes.length,sha256:hash(bytes)});
}
const browser=await launchChromium(loadPlaywright().chromium);
try{
  let articlePath;
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
    if(!production)await context.route('**/*',route=>route.continue({headers:{...route.request().headers(),...(new URL(route.request().url()).origin===origin?headers:{})}}));
    const page=await context.newPage();
    for(const route of ['/articles','/','detail']){
      if(route==='detail'&&!articlePath)continue;
      const path=route==='detail'?articlePath:route,errors=[],failed=[];
      const onError=error=>errors.push(error.message);
      const onFailed=request=>{if(new URL(request.url()).origin===origin&&['image','script','stylesheet','font'].includes(request.resourceType()))failed.push({url:request.url(),error:request.failure()?.errorText});};
      page.on('pageerror',onError);page.on('requestfailed',onFailed);
      const response=await page.goto(origin+path+'?release='+sha,{waitUntil:'domcontentloaded'});
      // UAT may intentionally have Articles disabled; never enable it for a smoke.
      if(!production&&path==='/articles'&&response.status()===404){
        report.routes.push({path,width,status:404,note:'UAT Articles disabled; no content or settings changed'});
        page.off('pageerror',onError);page.off('requestfailed',onFailed);continue;
      }
      assert.equal(response.status(),200,path);
      await page.locator('main h1:visible').first().waitFor({timeout:60000});
      const decline=page.getByRole('button',{name:'ไม่อนุญาต',exact:true});
      if(await decline.isVisible())await decline.click();
      await page.evaluate(()=>document.fonts.ready);
      if(path==='/articles'){
        const link=page.locator('.ar-item a[href^="/articles/"]').first();
        if(await link.count())articlePath=new URL(await link.getAttribute('href'),origin).pathname;
        if(production)assert.ok(articlePath,'Published articles are present');
      }
      for(let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=650){
        await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(180);
      }
      const media=await page.locator('img').evaluateAll(async images=>{
        const visible=images.filter(img=>img.getClientRects().length&&!img.closest('details:not([open])'));
        await Promise.all(visible.filter(img=>img.src).map(img=>img.decode().catch(()=>{})));
        return visible.filter(img=>img.src).map(img=>({src:img.currentSrc||img.src,width:img.naturalWidth,height:img.naturalHeight,srcset:img.srcset}));
      });
      assert.deepEqual(media.filter(img=>!img.width),[],path+' broken images');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path+' overflow');
      if(production&&path==='/articles')assert.ok(media.some(img=>img.src.includes('/assets/articles/responsive/')&&img.srcset),'Responsive article image delivered');
      const name=route==='detail'?'detail':path==='/'?'home':'index';
      if(route==='detail'&&width===390){
        const toc=page.locator('.ad-toc');
        if(await toc.count()){
          const positions=await page.evaluate(()=>({toc:document.querySelector('.ad-toc').getBoundingClientRect().top,body:document.querySelector('.ad-prose').getBoundingClientRect().top}));
          assert.ok(positions.toc<positions.body,'Mobile TOC precedes the article body');
        }
      }
      const target=path==='/'?page.locator('#articles'):route==='detail'&&width===390?page.locator('.ad-toc'):page.locator('main');
      if(await target.count())await target.scrollIntoViewIfNeeded();else await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      if(path==='/articles'||route==='detail'&&width===1440)await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      const file=`${out}/${name}-${width}.png`;
      await page.screenshot({path:file,fullPage:path==='/articles'});
      report.captures.push({file,path,width,dpr:1,auth:'anonymous',data:'hosted existing data'});
      assert.deepEqual(errors,[],path+' page errors');assert.deepEqual(failed,[],path+' failed resources');
      report.routes.push({path,width,status:response.status(),media,errors,failed});
      page.off('pageerror',onError);page.off('requestfailed',onFailed);
    }
    await context.close();
  }
  for(const path of ['/admin','/admin/login','/admin/content']){
    const response=await fetch(origin+path,{headers});assert.equal(response.status,200);
    assert.match(response.headers.get('x-robots-tag')||'',/noindex/);
    await response.arrayBuffer();
  }
  report.passed=true;
  console.log('PASS hosted article release: exact assets, responsive media, Home/index/detail desktop/mobile, TOC order and private noindex. No content writes.');
}finally{
  await browser.close();fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
}
