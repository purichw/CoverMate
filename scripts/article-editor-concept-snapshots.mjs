import fs from 'node:fs/promises';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {articleCanvas} from './lib/article-editor-ui.mjs';

const out='uat-results/article-editor-concept',server=await startArticlesAdminPreview();
const browser=await launchChromium(loadPlaywright().chromium),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const evidence={url:server.baseUrl+'/admin#articles',data:'Synthetic seeded article, no production access',engine:'Chromium',captures:[]};
await fs.mkdir(out,{recursive:true});page.setDefaultTimeout(15000);
try{
  await page.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());
  await page.goto(evidence.url);await page.locator('[data-article-state=ready]').waitFor();await page.locator('[data-article-action=edit]').first().click();
  await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  const position=async selector=>page.locator(selector).evaluate(el=>window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+scrollY-(innerWidth<768?148:96)),behavior:'instant'}));
  const capture=async(name,fullPage=false)=>{
    await page.screenshot({path:out+'/'+name+'.png',fullPage});
    evidence.captures.push({name,viewport:page.viewportSize(),fullPage,scroll:await page.evaluate(()=>scrollY)});
  };
  await page.evaluate(()=>scrollTo(0,0));await capture('desktop-overview',true);await capture('desktop-checklist-final');
  await page.locator('.ae-validation-summary > summary').click();await position('.ae-metadata');await capture('desktop-metadata-final');
  await page.locator('[data-reader-panel=cover]').click();await position('.ae-metadata');await capture('desktop-cover-final');
  await page.locator('[data-reader-panel=card]').click();await position('.ae-metadata');await capture('desktop-card-final');
  await page.locator('[data-ae=fullscreen]').click();await capture('desktop-writing-final');await page.locator('[data-ae=fullscreen]').click();
  await page.setViewportSize({width:375,height:900});await page.locator('[data-reader-panel=basic]').click();
  await page.evaluate(()=>scrollTo(0,0));await capture('mobile-overview',true);
  await position('.ae-metadata');await capture('mobile-metadata-final');
  await page.locator('[data-reader-panel=cover]').click();await position('.ae-metadata');await capture('mobile-cover-final');
  await page.locator('.ae-validation-summary > summary').click();await position('.ae-validation-summary');await capture('mobile-checklist-final');
  await page.locator('[data-ae=fullscreen]').click();await capture('mobile-writing-final');
  console.log('Captured current desktop/mobile editor states at '+out);
}finally{await fs.writeFile(out+'/provenance.json',JSON.stringify(evidence,null,2));await browser.close();await new Promise(resolve=>server.server.close(resolve));}
