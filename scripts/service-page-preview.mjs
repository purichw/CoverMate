// Memory-only visual/editor fixture. Never publishes or sends customer data.
import fs from 'node:fs';
import vm from 'node:vm';
import {startStaticServer} from './lib/static-server.mjs';
import {sanitizeStateDoc} from '../covermate-contract.js';
import {createPageHandler} from '../server/seo-page.mjs';

const argument=process.argv.indexOf('--fixture');
const raw=argument>=0 ? JSON.parse(fs.readFileSync(process.argv[argument+1],'utf8')) : {config:JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)')),text:{}};
const live=sanitizeStateDoc(raw.state || raw,{repeatableIds:true});
let draft=structuredClone(live),saves=0;
const liveBefore=JSON.stringify(live);
const publicFixture=`import {cacheSiteState} from '/covermate-contract.js';export const hydrateLocalContent=async()=>{const seed=document.getElementById('covermate-published-state');if(seed){cacheSiteState('live',JSON.parse(seed.textContent).state);seed.remove();}return {live:true,publicLive:true};};export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};export const prepareContactLead=async()=>{throw new Error('Local fixture: submissions disabled');};export const sendContactLead=prepareContactLead;export const submitContactLead=prepareContactLead;`;
const ownerFixture=`import {cacheSiteState} from '/covermate-contract.js';const user={uid:'service-fixture-owner',email:'local-fixture@example.invalid',getIdToken:async()=> 'local-only'};const session={email:user.email,role:'owner',ts:Date.now(),exp:Date.now()+86400000};const hydrateLocalContent=async()=>{const states=await fetch('/__service-state').then(r=>r.json());cacheSiteState('live',states.live);cacheSiteState('draft',states.draft);return {live:true,draft:true};};window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),hydrateLocalContent,saveSiteState:async(_name,config,text)=>{const response=await fetch('/__service-state',{method:'POST',body:JSON.stringify({config,text})});if(!response.ok)throw new Error('Local draft save failed');return response.json();},publishSiteState:async()=>{throw new Error('Local fixture: publishing disabled');},signOut:async()=>{}};window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));`;
const handler=createPageHandler({readPublished:async()=>live,readArticles:async()=>({available:true,settings:{enabled:true,showHome:false,showNavigation:true},items:[]})});
const {server,baseUrl}=await startStaticServer({ownerRoutesToRoot:true,headers:{'Content-Security-Policy':"connect-src 'self'; form-action 'self'"},onRequest:async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(['/admin/content','/admin/edit','/admin/preview'].includes(pathname)) {
    const sessionScript=`<script>localStorage.setItem('covermate-admin-session',JSON.stringify({email:'local-fixture@example.invalid',role:'owner',exp:Date.now()+86400000}));</script>`;
    res.writeHead(200,{'Content-Type':'text/html'});res.end(fs.readFileSync('index.html','utf8').replace('<head>','<head>'+sessionScript));return true;
  }
  if(pathname==='/__service-state') {
    if(req.method==='POST') {const chunks=[];for await(const chunk of req)chunks.push(chunk);const payload=JSON.parse(Buffer.concat(chunks).toString());draft=sanitizeStateDoc({config:payload.config,text:payload.text,revision:(draft.revision||0)+1},{repeatableIds:true});saves++;}
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(req.method==='POST'?{ok:true}:{live,draft,saves,liveUnchanged:JSON.stringify(live)===liveBefore}));return true;
  }
  if(pathname==='/covermate-firebase.js'||pathname==='/covermate-public.mjs') {res.writeHead(200,{'Content-Type':'text/javascript'});res.end(pathname.includes('firebase')?ownerFixture:publicFixture);return true;}
  if(pathname.startsWith('/api/')) {res.writeHead(403);res.end('Local fixture: API and customer writes disabled');return true;}
  if(['/','/motor','/health','/life','/articles'].includes(pathname)) {await handler(req,res);return true;}
}});
console.log(JSON.stringify({baseUrl,health:baseUrl+'/health',life:baseUrl+'/life?lang=en',editor:baseUrl+'/admin/content?page=health',state:baseUrl+'/__service-state',scope:'Memory-only draft saves; publishing and external connections disabled'}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
