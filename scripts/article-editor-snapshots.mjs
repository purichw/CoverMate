import fs from 'node:fs/promises';
import sharp from 'sharp';
import AxeBuilder from '@axe-core/playwright';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {articleCanvas} from './lib/article-editor-ui.mjs';

const out='uat-results/article-editor',server=await startArticlesAdminPreview();
const pw=loadPlaywright(),browser=await launchChromium(pw.chromium);
const report={url:server.baseUrl+'/admin#articles',data:'Synthetic local design sample; unpublished',viewport:{width:1440,height:1000},capturedAt:new Date().toISOString(),checks:[]};
await fs.mkdir(out,{recursive:true});
try {
  const context=await browser.newContext({viewport:report.viewport,reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());
  const page=await context.newPage();
  await page.goto(report.url);await page.locator('[data-article-state=ready]').waitFor();
  await page.locator('[data-article-action=edit]').first().click();await page.locator('.ae-workspace').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.querySelectorAll('.ae-workspace img')].every(img=>img.complete&&img.naturalWidth));
  const audit=await new AxeBuilder({page}).include('.ae-workspace').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  report.accessibility=audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  await page.screenshot({path:out+'/desktop-final-full.png',fullPage:true});
  await page.screenshot({path:out+'/desktop-final-top.png'});
  await page.setViewportSize({width:390,height:900});await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:out+'/mobile-final-top.png'});
  await articleCanvas(page).locator('.ae-editor-host:visible .article-callout').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/mobile-final-formatting.png'});
  await page.locator('.ae-file-actions').scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/mobile-final-bottom.png'});
  await page.screenshot({path:out+'/mobile-final-full.png',fullPage:true});
  await page.locator('[data-ae=settings]:visible').click();await page.locator('.ae-settings-dialog').waitFor();
  await page.locator('.ae-settings-dialog [data-field=featured]').scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/mobile-final-settings.png'});
  const settingsAudit=await new AxeBuilder({page}).include('.ae-settings-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  report.settingsAccessibility=settingsAudit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  report.checks.push('Clean fixture, desktop complete page, mobile top/formatting/end and publication pin settings');
  const refs={desktop:'/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-b66fb1b8-139d-4f6c-ad16-c073cc0167dc.png',mobile:'/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-93911941-f496-4979-8e24-5b1327759e58.png'};
  const cropDesktop={left:85,top:310,width:2860,height:2370},cropMobile={left:84,top:315,width:1235,height:3290};
  const label=(text,width)=>Buffer.from(`<svg width="${width}" height="42"><rect width="100%" height="100%" fill="#f2f5f4"/><text x="12" y="27" font-family="Arial" font-size="16" fill="#263830">${text}</text></svg>`);
  async function sheet(name,panels,width){
    const images=[];
    for(const panel of panels){let source=sharp(panel.path);if(panel.crop)source=source.extract(panel.crop);const image=await source.resize({width}).png().toBuffer();images.push({...panel,image,height:(await sharp(image).metadata()).height});}
    const height=Math.max(...images.map(item=>item.height))+62;
    await sharp({create:{width:(width+16)*images.length+16,height,channels:3,background:'#f2f5f4'}}).composite(images.flatMap((item,i)=>[{input:label(item.label,width),left:16+i*(width+16),top:0},{input:item.image,left:16+i*(width+16),top:42}])).png().toFile(out+'/'+name);
  }
  await sheet('desktop-reference-development.png',[{path:refs.desktop,crop:cropDesktop,label:'Reference - supplied mockup'},{path:out+'/desktop-final-full.png',label:'Development - full editor, 1440px'}],600);
  await sheet('mobile-reference-development.png',[{path:refs.mobile,crop:cropMobile,label:'Reference - mobile mockup'},{path:out+'/mobile-final-top.png',label:'Development - top, 390px'},{path:out+'/mobile-final-formatting.png',label:'Development - formatting'},{path:out+'/mobile-final-bottom.png',label:'Development - end / save'}],300);
  report.references={...refs,crops:{desktop:cropDesktop,mobile:cropMobile},note:'Image-only references cropped to app frame, aspect ratio preserved. Development includes additional requested blocks and metadata; not identical content length.'};
  await fs.writeFile(out+'/snapshots-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(report.accessibility.length||report.settingsAccessibility.length)process.exitCode=1;
} finally {await browser.close();await new Promise(resolve=>server.server.close(resolve));}
