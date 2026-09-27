import fs from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {startStaticServer} from './lib/static-server.mjs';
import {createPageHandler,createPublishedReader} from '../server/seo-page.mjs';
import {extractBundlerTemplate,replaceBundlerTemplate} from '../server/bundler-template.mjs';
import {homeArticleFixture} from './fixtures/home-articles/feed.mjs';

export async function startHomeArticlesPreview({state,feed = structuredClone(homeArticleFixture),details = null} = {}) {
  state ||= {config:JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)')),text:{}};
  const handler=createPageHandler({readPublished:async()=>state,readArticle:async(_site,slug)=>({available:true,sample:true,item:details?.items?.find(item=>item.slug===slug)}),readHtml:()=>{
    const html=fs.readFileSync('index.html','utf8');
    const seed='<script type="application/json" id="covermate-article-feed">'+JSON.stringify(feed).replace(/</g,'\\u003c')+'</script>';
    return replaceBundlerTemplate(html,extractBundlerTemplate(html).replace('</head>',seed+'</head>'));
  }});
  const publicFixture=`import {cacheSiteState} from '/covermate-contract.js';
    export const hydrateLocalContent=async()=>{const node=document.getElementById('covermate-published-state');if(node){cacheSiteState('live',JSON.parse(node.textContent).state);node.remove();}return {live:true,publicLive:true};};
    export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};
    export const prepareContactLead=async input=>({body:JSON.stringify(input),key:crypto.randomUUID()});
    export const sendContactLead=async()=>{throw Object.assign(new Error('Local preview: submissions disabled'),{outcome:'failure',dispatched:false});};
    export const submitContactLead=sendContactLead;`;
  const server=await startStaticServer({headers:{'Content-Security-Policy':"connect-src 'self'; form-action 'self'"},onRequest:async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname.startsWith('/api/') || pathname.startsWith('/admin')) {res.writeHead(403);res.end('Read-only Home design preview');return true;}
    if(pathname==='/covermate-public.mjs') {res.writeHead(200,{'Content-Type':'text/javascript'});res.end(publicFixture);return true;}
    if(/^\/assets\/article-preview\/(motor|health|travel)\.jpg$/.test(pathname)) {
      res.writeHead(200,{'Content-Type':'image/jpeg'});res.end(fs.readFileSync(new URL('./fixtures/home-articles/'+pathname.split('/').pop(),import.meta.url)));return true;
    }
    if(pathname==='/assets/article-preview/family-health-v1.webp') {res.writeHead(200,{'Content-Type':'image/webp'});res.end(fs.readFileSync(new URL('./fixtures/home-articles/family-health-v1.webp',import.meta.url)));return true;}
    if(pathname.startsWith('/articles/')) {
      if(details) {await handler(req,res);return true;}
      const en=new URL(req.url,'http://localhost').searchParams.get('lang')==='en';
      res.writeHead(501,{'Content-Type':'text/html; charset=utf-8'});
      res.end(`<!doctype html><html lang="${en?'en':'th'}"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Home design preview</title><body><main><h1>${en?'This page is next':'หน้านี้จะทำในขั้นตอนถัดไป'}</h1><p>${en?'This preview covers the Home articles section only. These are sample article links.':'Preview รอบนี้ทำเฉพาะส่วนบทความบน Home ลิงก์นี้เป็นตัวอย่างของหน้าบทความที่ยังไม่ได้สร้าง'}</p><a href="/${en?'?lang=en':''}#articles">${en?'Return to Home':'กลับหน้า Home'}</a></main></body></html>`);return true;
    }
    if(pathname==='/' || pathname==='/motor' || pathname==='/articles') {await handler(req,res);return true;}
  }});
  return {...server,state,setFeed:value=>{feed=value;},setDetails:value=>{details=value;}};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const fixture=process.argv.find(arg=>arg.startsWith('--fixture='))?.slice(10);
  const state=fixture?JSON.parse(fs.readFileSync(fixture,'utf8')):process.argv.includes('--live')?await createPublishedReader({includeState:true})('covermate'):undefined;
  const {baseUrl}=await startHomeArticlesPreview({state});
  console.log('LOCAL DESIGN PREVIEW: sample articles only; no CMS writes or real submissions.');
  console.log(baseUrl+'/#articles');
}
