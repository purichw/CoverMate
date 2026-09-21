import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { importCoverMateContract } from './lib/contract-loader.mjs';
const require=createRequire(import.meta.url);
const {makeMediaHandler,authorize,verifyMediaToken}=require('../api/media.js');
const cloudinary=require('../server/cloudinary.cjs');
const contract=await importCoverMateContract();
const owner={uid:'local-owner',env:{siteId:'covermate-uat',isUat:true}};
let writes=0;
const handler=makeMediaHandler({authorize:async req=>{if(req.headers.authorization!=='Bearer local-test')throw Object.assign(Error('Denied'),{status:401});return owner;},reserve:async()=>{},store:async(actor,images)=>{
  assert.equal(actor.env.siteId,'covermate-uat');
  assert.equal((await sharp(images.image).metadata()).format,'png');writes++;
  return {source:'https://media.example.test/source.png',image:'https://media.example.test/image.png'};
}});
const png=await sharp({create:{width:120,height:63,channels:4,background:{r:20,g:60,b:150,alpha:0.5}}}).png().toBuffer();
const data='data:image/png;base64,'+png.toString('base64');
async function run(body,headers={authorization:'Bearer local-test'},method='POST') {
  let result;const res={statusCode:200,setHeader(){},end(value){result={status:this.statusCode,body:JSON.parse(value)};}};
  await handler({method,headers,body},res);return result;
}
assert.equal((await run({image:data,source:data},{})).status,401);
assert.equal((await run({image:data,source:data},{},'GET')).status,405);
assert.equal((await run({image:'data:image/svg+xml;base64,PHN2Zz4=',source:data})).status,422);
assert.equal((await run({image:'data:image/png;base64,AAAA',source:data})).status,422);
assert.equal((await run({image:data,source:data})).status,201);
assert.equal((await run({image:data,source:data},{authorization:'Bearer local-test','content-length':'4200000'})).status,413);
assert.equal(writes,1,'Invalid or unauthenticated requests never reach storage');
for (const role of ['owner','advisor','ops','readonly']) {
  const deps={verifyToken:async()=>({uid:'owner'}),readAdmin:async()=>({active:true,role})};
  const req={headers:{authorization:'Bearer test',host:'covermateinsurance.com'},url:'/api/media'};
  if(role==='owner')assert.equal((await authorize(req,deps)).uid,'owner');
  else await assert.rejects(authorize(req,deps),e=>e.status===403);
}
const uatDeps={verifyToken:async()=>({uid:'uat-owner'}),readAdmin:async()=>({active:true,role:'owner',uatOnly:true})};
await assert.rejects(authorize({headers:{authorization:'Bearer test',host:'covermateinsurance.com'},url:'/api/media?cm_env=uat'},uatDeps),e=>e.status===403);
assert.equal((await authorize({headers:{authorization:'Bearer test',host:'covermate-uat.vercel.app'},url:'/api/media'},uatDeps)).env.siteId,'covermate-uat');
await assert.rejects(authorize({headers:{authorization:'Bearer test'}},{verifyToken:async()=>({uid:'disabled'}),readAdmin:async()=>({active:false,role:'owner'})}),e=>e.status===403);
const config=contract.sanitizeMotorCountConfig({sections:[],brand:{},contact:{},theme:{},header:{},footer:{}});
const slots=contract.cmsImageSlots(config);
assert.equal(slots.find(s=>s.path==='seo.image').width/slots.find(s=>s.path==='seo.image').height,1200/630);
assert.equal(slots.find(s=>s.path==='brand.media.favicon').width,512);
console.log('PASS media API: owner authorization, UAT separation, invalid/oversized images, PNG re-encoding and no unauthorized storage writes.');

const verifyJwt=async()=>({uid:'owner',auth_time:100});
assert.equal((await verifyMediaToken('token',{verifyJwt,request:async()=>({ok:true,json:async()=>({users:[{localId:'owner',validSince:'99'}]})})})).uid,'owner');
for(const account of [null,{localId:'other'},{localId:'owner',disabled:true},{localId:'owner',validSince:'101'}]) {
  await assert.rejects(verifyMediaToken('token',{verifyJwt,request:async()=>({ok:true,json:async()=>({users:account?[account]:[]})})}),e=>e.status===401);
}
await assert.rejects(verifyMediaToken('token',{verifyJwt,request:async()=>({ok:false,status:503})}),e=>e.status===503);
await assert.rejects(verifyMediaToken('expired',{verifyJwt:async()=>{throw Error('JWT expired');},request:async()=>{throw Error('must not call');}}),/JWT expired/);

const env={COVERMATE_CLOUDINARY_CLOUD_NAME:'test-cloud',COVERMATE_CLOUDINARY_API_KEY:'123',COVERMATE_CLOUDINARY_API_SECRET:'test-secret'};
let uploads=0;
const requests=[];
const request=async(url,options)=>{
  requests.push(url);
  if(url.endsWith('/usage'))return {ok:true,json:async()=>({plan:'Free',credits:{usage:1,limit:25}})};
  const fields=Object.fromEntries(options.body);
  assert.equal(fields.overwrite,'false');
  assert.equal(fields.signature,cloudinary.signature({public_id:fields.public_id,timestamp:fields.timestamp,overwrite:fields.overwrite},env.COVERMATE_CLOUDINARY_API_SECRET));
  assert.match(fields.public_id,/^covermate\/cms-media\/covermate-uat\/[\w-]+\/(source|image)$/);
  assert.equal(fields.file.type,'image/png');
  assert.equal(fields.transformation,undefined);
  uploads++;
  return {ok:true,json:async()=>({public_id:fields.public_id,version:123,format:'png',secure_url:'https://res.cloudinary.com/test-cloud/image/upload/v123/'+fields.public_id+'.png'})};
};
const saved=await cloudinary.store(owner,{source:png,image:png},{env,request});
assert.equal(uploads,2);
assert.match(saved.source,/\/source.png$/);
assert.match(saved.image,/\/image.png$/);
assert.ok(requests[0].endsWith('/usage'));
assert.throws(()=>cloudinary.configuration({}),e=>e.code==='media_not_configured');
for(const usage of [{plan:'Plus',credits:{usage:1,limit:25}},{plan:'Free'},{plan:'Free',credits:{usage:20,limit:25}}]) {
  await assert.rejects(cloudinary.store(owner,{source:png,image:png},{env,request:async()=>({ok:true,json:async()=>usage})}),e=>['media_plan_unverified','media_quota_guard'].includes(e.code));
}
await assert.rejects(cloudinary.store(owner,{source:png,image:png},{env,request:async()=>({ok:false})}),e=>e.code==='media_usage_unavailable');
await assert.rejects(cloudinary.store(owner,{source:png,image:png},{env,request:async(url,options)=>url.endsWith('/usage')?request(url,options):{ok:false}}),e=>e.code==='media_upload_failed');
await assert.rejects(cloudinary.store(owner,{source:png,image:png},{env,request:async(url,options)=>url.endsWith('/usage')?request(url,options):{ok:true,json:async()=>({secure_url:'https://evil.test/image.png'})}}),e=>e.code==='media_response_invalid');
await assert.rejects(cloudinary.store(owner,{source:png,image:png},{env,request:async()=>{throw new Error('Timeout');}}));
console.log('PASS Cloudinary: signed immutable uploads, site namespace, trusted URLs, free-plan quota guard and fail-closed provider errors.');
