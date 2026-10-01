import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

const url=process.argv[2];
if(!url || new URL(url).hostname!=='127.0.0.1')throw new Error('Pass the loopback preview URL.');
const out='uat-results/articles-list-redesign';
fs.mkdirSync(out,{recursive:true});
const desktop='/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-1d2d188a-12f5-459e-af86-b05b5cb9448c.png';
const mobile='/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-4aebabc0-798c-4f13-bcf9-d67513da006e.png';
const file=name=>path.join(out,name+'.png');
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
// Crop only the supplied slide/device framing; preserve the website's aspect ratio.
const referenceCrops=[
  {name:'reference-desktop',source:desktop,rect:{left:189,top:0,width:744,height:1402}},
  {name:'reference-mobile-top',source:mobile,rect:{left:247,top:191,width:447,height:563}},
  {name:'reference-mobile-list',source:mobile,rect:{left:247,top:764,width:447,height:400}},
  {name:'reference-mobile-end',source:mobile,rect:{left:247,top:1326,width:447,height:174}}
];
for(const crop of referenceCrops)await sharp(crop.source).extract(crop.rect).png().toFile(file(crop.name));
const browser=await launchChromium(loadPlaywright().chromium);
const captures=[];
try {
  for(const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:width===390?844:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
    await page.goto(url);await page.locator('.ar-index').waitFor();
    await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
    await page.evaluate(()=>document.fonts.ready);
    if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
    await page.mouse.move(0,0);
    // Load lazy media and reveal the real footer before taking full-page evidence.
    for(let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=650){
      await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(100);
    }
    await page.waitForFunction(()=>[...document.querySelectorAll('.ar-index img')].every(img=>img.complete));
    await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
    await page.screenshot({path:file('final-'+width),fullPage:true});
    await page.screenshot({path:file('final-'+width+'-top')});
    captures.push({name:'final-'+width,url:page.url(),viewport:page.viewportSize(),scrollY:0});
    if(width===390) {
      const bottom=await page.locator('.ar-featured').evaluate(el=>Math.ceil(el.getBoundingClientRect().bottom+12));
      await sharp(file('final-390-top')).extract({left:0,top:0,width,height:Math.min(bottom,844)}).toFile(file('development-mobile-top'));
      for(const [name,target,last] of [['list','#articles-results','.ar-item:nth-child(2)'],['end','.ar-load-more','.ar-consult']]) {
        await page.locator(target).evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-90));
        await page.waitForTimeout(200);
        await page.screenshot({path:file('final-mobile-'+name)});
        const top=70,bottom=await page.locator(last).evaluate(el=>Math.ceil(el.getBoundingClientRect().bottom+16));
        await sharp(file('final-mobile-'+name)).extract({left:0,top,width,height:Math.min(bottom,844)-top}).toFile(file('development-mobile-'+name));
        captures.push({name:'final-mobile-'+name,url:page.url(),viewport:page.viewportSize(),scrollY:await page.evaluate(()=>scrollY),crop:{top,bottom:Math.min(bottom,844)}});
      }
    }
    await page.close();
  }
  const encode=name=>'data:image/png;base64,'+fs.readFileSync(file(name)).toString('base64');
  const board=await browser.newPage({deviceScaleFactor:1});
  const sheet=async(name,width,rows,note)=>{
    await board.setViewportSize({width:width*2+68,height:1000});
    const panels=rows.flatMap(row=>[{label:'Reference / '+row.label,name:row.reference},{label:'Development / '+row.label,name:row.development}]);
    await board.setContent('<html><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#f4f5f4;color:#252925;font:14px system-ui}h1{font-size:23px;margin:0 0 8px}p{margin:0 0 20px;max-width:1100px;line-height:1.5}main{display:grid;grid-template-columns:repeat(2,'+width+'px);gap:24px 20px;align-items:start}section{min-width:0}h2{margin:0 0 10px;font-size:16px}img{display:block;width:100%;height:auto;border:1px solid #cdd2cd}</style><h1>CoverMate / Articles list</h1><p>'+note+'</p><main>'+panels.map(panel=>'<section><h2>'+panel.label+'</h2><img src="'+encode(panel.name)+'"></section>').join('')+'</main></html>');
    await board.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
    await board.screenshot({path:file(name),fullPage:true});
  };
  await sheet('comparison-desktop',744,[{label:'full page',reference:'reference-desktop',development:'final-1440'}],
    'Desktop: reference website cropped from the supplied slide; development rendered at 1440px. Both shown at 744px wide without stretching. Published CMS copy + labeled sample catalog; existing header/footer retained. Different copy, imagery and item counts are not pixel-parity claims.');
  await sheet('comparison-mobile',390,[
    {label:'header, search and featured article',reference:'reference-mobile-top',development:'development-mobile-top'},
    {label:'latest heading and first two results',reference:'reference-mobile-list',development:'development-mobile-list'},
    {label:'load more and consultation CTA',reference:'reference-mobile-end',development:'development-mobile-end'}
  ],'Mobile: phone content cropped and scaled proportionally from 447px to 390px; development rendered at 390px. Matched sections, not equal heights. CMS copy and sample imagery differ. Existing LINE dock/footer retained instead of mock account navigation; full viewport evidence saved separately.');
  fs.writeFileSync(path.join(out,'snapshot-provenance.json'),JSON.stringify({
    url,browser:await browser.version(),deviceScaleFactor:1,reducedMotion:'reduce',auth:'anonymous, local read-only preview',
    data:'Published CMS readback + labeled local sample article catalog; no production writes',
    commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),diffSha256:hash(execFileSync('git',['diff'],{maxBuffer:16*1024*1024})),
    references:[desktop,mobile].map(source=>({source,sha256:hash(fs.readFileSync(source))})),referenceCrops,captures,
    limits:'Image references use inferred CSS scale. CMS copy, real shell, catalog size and photos differ; no invented account navigation. No Safari/physical-device claim.'
  },null,2));
  console.log('Captured '+file('comparison-desktop')+' and '+file('comparison-mobile'));
}finally{await browser.close();}
