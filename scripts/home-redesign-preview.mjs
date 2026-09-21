import fs from 'node:fs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';

const fixture = await createHomeFixture(process.argv[2]);
const output = 'uat-results/home-redesign';
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(output+'/proposed-draft-diff.json',JSON.stringify(fixture.proposal,null,2));
const {baseUrl} = await startStaticServer({ownerRoutesToRoot:true,port:Number(process.env.PORT || 0),onRequest:async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/admin')) { res.writeHead(403); res.end('Read-only local design preview. Admin verification uses the isolated browser harness.'); return true; }
  if(url.pathname==='/api/leads') { res.writeHead(503,{'content-type':'application/json'}); res.end(JSON.stringify({error:'local_preview',message:'No leads are stored in this local design preview.'})); return true; }
  if(url.pathname==='/covermate-public.mjs') {
    const source=fs.readFileSync('covermate-public.mjs','utf8').replace('${publicFirestoreRoot()}', '${location.origin}/__home-fixture');
    res.writeHead(200,{'content-type':'application/javascript'}); res.end(source); return true;
  }
  if(url.pathname.startsWith('/__home-fixture/')) { res.writeHead(200,{'content-type':'application/json'}); res.end(JSON.stringify({fields:toFirestoreFields(fixture.state)})); return true; }
}});
console.log('LOCAL DRAFT ONLY. No production CMS writes or lead storage.');
console.log(baseUrl);
