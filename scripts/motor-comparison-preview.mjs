import fs from 'node:fs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { createPageHandler } from '../server/seo-page.mjs';

// Read-only local preview of a supplied CMS snapshot. Owner editing is exercised
// by motor-comparison-browser-check.mjs with isolated in-memory persistence.
const input = JSON.parse(fs.readFileSync(process.argv[2] || 'uat-results/motor-comparison/published-baseline.json','utf8'));
const contract = await importCoverMateContract();
const state = contract.sanitizeStateDoc(input.state || input,{repeatableIds:true});
const pageHandler = createPageHandler({readPublished:async()=>state});
const {baseUrl} = await startStaticServer({port:Number(process.env.PORT || 0),onRequest:async(req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) {
    res.writeHead(403,{'content-type':'text/plain'});res.end('Read-only local design preview.');return true;
  }
  if (url.pathname === '/covermate-public.mjs') {
    const source = fs.readFileSync('covermate-public.mjs','utf8').replace('${publicFirestoreRoot()}','${location.origin}/__comparison-preview');
    res.writeHead(200,{'content-type':'application/javascript'});res.end(source);return true;
  }
  if (url.pathname.startsWith('/__comparison-preview/')) {
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({fields:toFirestoreFields(state)}));return true;
  }
  if (['/','/motor'].includes(url.pathname)) {await pageHandler(req,res);return true;}
}});
console.log('Read-only local comparison preview (no production writes): '+baseUrl+'/motor#tiers');
