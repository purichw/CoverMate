import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { buildVisitorRuntime } from './lib/visitor-source.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const contract=await importCoverMateContract();
const fixture='uat-results/home-advisor/fixture.json';
const defaults=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const raw=fs.existsSync(fixture)?JSON.parse(fs.readFileSync(fixture,'utf8')):{config:defaults,text:{}};
const source=JSON.stringify(raw);
const live=contract.sanitizeStateDoc(raw,{repeatableIds:true});
assert.equal(JSON.stringify(raw),source,'Normalization cannot mutate published input');
assert.equal(live.config.advisor.fullName.th,'');
assert.equal(live.config.advisor.fullName.en,'');
assert.equal(live.config.advisor.photo,'');

const custom=structuredClone(live.config);
custom.cmsContentVersion=14;
custom.advisor={fullName:{th:'CMS_TEST_TH',en:''},role:{th:'CMS_ROLE_TH',en:'CMS_ROLE_EN'},contactBefore:{th:'OWNER_COPY',en:''},photo:''};
const migrated=contract.migrateCmsContent(custom);
assert.equal(migrated.cmsContentVersion,contract.CMS_CONTENT_VERSION);
assert.deepEqual(migrated.advisor.fullName,custom.advisor.fullName);
assert.deepEqual(migrated.advisor.role,custom.advisor.role);
assert.deepEqual(migrated.advisor.contactBefore,custom.advisor.contactBefore);
for(const key of ['brand','contact','licences','sections','motorPage','footer'])assert.deepEqual(migrated[key],custom[key],key+' owner values preserved');
assert.deepEqual(contract.migrateCmsContent(migrated),migrated,'Migration is idempotent');
assert.ok(contract.cmsImageSlots(migrated).some(slot=>slot.path==='advisor.photo'));

const sandbox={console,URL,URLSearchParams,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>fn(),
  window:{innerWidth:1440,location:{pathname:'/',search:'',origin:'http://localhost',href:'http://localhost/'},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}},
  document:{querySelector:()=>null,querySelectorAll:()=>[],documentElement:{setAttribute(){},removeAttribute(){}},body:null},
  DCLogic:class{setState(value,callback){Object.assign(this.state,typeof value==='function'?value(this.state):value);callback?.();}}
};
vm.runInNewContext(buildVisitorRuntime()+'\nthis.Component=Component;',sandbox);
const app=new sandbox.Component();
app.readJSON=()=>null;app.writeJSON=()=>{};app.queueRemoteDraft=()=>{};app.textOv={};
app.state.site=app.normalizeConfig(live.config,{repeatableIds:true});
assert.equal(app.renderVals().homeAdvisor.hasContactIntro,false);
app.state.site.advisor=structuredClone(migrated.advisor);
app.state.lang='th';assert.equal(app.renderVals().homeAdvisor.name,'CMS_TEST_TH');
app.state.lang='en';assert.equal(app.renderVals().homeAdvisor.name,'','No cross-language inferred personal identity');
app.state.lang='th';app.state.routePage='motor';assert.equal(app.renderVals().homeAdvisor.name,'','Home only');
app.state.routePage='home';
const field=app.renderVals().cmsGroups.find(g=>g.key==='Advisor profile').fields.find(f=>f.path==='advisor.fullName.th');
field.change({target:{value:'CMS_CHANGED_TH'}});field.commit({target:{value:'CMS_CHANGED_TH'}});
assert.equal(app.renderVals().homeAdvisor.name,'CMS_CHANGED_TH');
console.log('PASS advisor schema v15, missing-only migration, blank identity, language isolation, canonical CMS edit and Home-only projection.');

if(process.argv.includes('--browser')||process.argv.includes('--serve')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.tools/playwright-browsers');
  let draft=structuredClone(live),saves=0;
  const liveBefore=JSON.stringify(live);
  const firebaseFixture=`
    import {cacheSiteState} from '/covermate-contract.js';
    const user={uid:'local-advisor-owner',email:'local-fixture@example.invalid',getIdToken:async()=> 'local-only'};
    const session={email:user.email,role:'owner',ts:Date.now(),exp:Date.now()+86400000};
    const hydrateLocalContent=async()=>{const states=await fetch('/__advisor-state').then(r=>r.json());cacheSiteState('live',states.live);cacheSiteState('draft',states.draft);return {live:true,draft:true};};
    window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),hydrateLocalContent,
      saveSiteState:async(_name,config,text)=>{const response=await fetch('/__advisor-state',{method:'POST',body:JSON.stringify({config,text})});if(!response.ok)throw new Error('Local draft failed');return response.json();},
      publishSiteState:async()=>{throw new Error('Publishing disabled in local fixture');},signOut:async()=>{}};
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
  `;
  const publicFixture=`import {cacheSiteState} from '/covermate-contract.js';export const hydrateLocalContent=async()=>{const seed=document.getElementById('covermate-published-state');if(seed){cacheSiteState('live',JSON.parse(seed.textContent).state);seed.remove();}return {live:true,publicLive:true};};export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};export const prepareContactLead=async input=>Object.freeze({body:JSON.stringify(input),key:crypto.randomUUID()});export const sendContactLead=async()=>{throw Object.assign(new Error('Local preview: submissions disabled'),{outcome:'failure',dispatched:false});};export const submitContactLead=sendContactLead;`;
  const handler=createPageHandler({readPublished:async()=>draft});
  const {server,baseUrl}=await startStaticServer({ownerRoutesToRoot:true,headers:{'Content-Security-Policy':"connect-src 'self'; form-action 'self'"},onRequest:async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(['/admin/content','/admin/edit','/admin/preview'].includes(pathname)){
      const sessionScript=`<script>localStorage.setItem('covermate-admin-session',JSON.stringify({email:'local-fixture@example.invalid',role:'owner',exp:Date.now()+86400000}));</script>`;
      res.writeHead(200,{'Content-Type':'text/html'});res.end(fs.readFileSync('index.html','utf8').replace('<head>','<head>'+sessionScript));return true;
    }
    if(pathname==='/__advisor-state'){
      if(req.method==='POST'){
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        draft=contract.sanitizeStateDoc({config:payload.config,text:payload.text,revision:(draft.revision||0)+1},{repeatableIds:true});saves++;
      }
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(req.method==='POST'?{ok:true}:{live,draft}));return true;
    }
    if(pathname==='/covermate-firebase.js'||pathname==='/covermate-public.mjs'){
      res.writeHead(200,{'Content-Type':'text/javascript'});res.end(pathname.includes('firebase')?firebaseFixture:publicFixture);return true;
    }
    if(pathname.startsWith('/api/')){res.writeHead(403);res.end('Local fixture: writes disabled');return true;}
    if(pathname==='/'||pathname==='/motor'){await handler(req,res);return true;}
  }});
  if(process.argv.includes('--serve')) console.log('Home advisor preview (memory-only CMS, no publish/submissions): '+baseUrl+'/');
  else {
    const out='uat-results/home-advisor';fs.mkdirSync(out,{recursive:true});
    const browser=await launchChromium(loadPlaywright().chromium),errors=[],checks=[];
    try {
      const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
      await context.route('**/*',route=>new URL(route.request().url()).origin===baseUrl?route.continue():route.fulfill({status:403,body:'External traffic blocked'}));
      const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
      const ready=async(url='/')=>{
        await page.goto(baseUrl+url);await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
        await page.locator('.hm-proof').waitFor();await page.evaluate(()=>document.fonts.ready);
        if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
      };
      const fit=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
      const nameNodes=()=>page.locator('main [data-cms-copy="advisor.fullName"]');
      await ready();
      assert.equal(await nameNodes().count(),0);
      assert.equal(await page.locator('.hm-proof details,.hm-proof button,.hm-advisor-photo').count(),0);
      assert.match(await page.locator('.hm-proof').innerText(),/CoverMate/);
      const baseline={footer:await page.locator('footer').innerHTML(),form:await page.locator('#talk form').innerHTML(),licences:await page.locator('.hm-licence-grid').innerHTML()};
      for(const width of [1440,390]){
        await page.setViewportSize({width,height:1000});await fit();
        await page.locator('[data-home-section="hero"]').screenshot({path:`${out}/home-fallback-${width}.png`});
      }
      checks.push('Actual published data has no person: CoverMate fallback, permanent Hero, original Contact copy');

      await page.setViewportSize({width:1440,height:1000});await page.goto(baseUrl+'/admin/content');
      await page.getByRole('button',{name:'แบรนด์และติดต่อ',exact:true}).click();
      await page.locator('[data-cms-group="Advisor profile"] summary').click();
      const edit=async(key,value)=>{const input=page.locator(`[data-cms-field="advisor.${key}"]`);await input.fill(value);await input.press('Tab');};
      // Clearly synthetic sentinels only; the existing brand mark tests image sizing, not a fake portrait.
      await edit('fullName.th','CMS_TEST_NAME_TH');await edit('role.th','CMS_TEST_ROLE_TH');
      await edit('photo','assets/logos/aia-logo.png');
      await page.getByRole('button',{name:'แก้ไขเนื้อหาภาษาอังกฤษ',exact:true}).click();
      await edit('fullName.en','CMS_TEST_NAME_EN');await edit('role.en','CMS_TEST_ROLE_EN');
      await page.waitForTimeout(1200);assert.ok(saves>0);
      await page.reload();await page.getByRole('button',{name:'แบรนด์และติดต่อ',exact:true}).click();
      const group=page.locator('[data-cms-group="Advisor profile"]');if(!(await group.evaluate(n=>n.open)))await group.locator('summary').click();
      await page.getByRole('button',{name:'แก้ไขเนื้อหาภาษาอังกฤษ',exact:true}).click();
      assert.equal(await page.locator('[data-cms-field="advisor.fullName.en"]').inputValue(),'CMS_TEST_NAME_EN');
      assert.equal(JSON.stringify(live),liveBefore,'No live mutation/publish');
      for(const key of ['brand','contact','licences','sections','footer','motorPage'])assert.deepEqual(draft.config[key],live.config[key],key+' unchanged by advisor edit');
      checks.push('Admin TH/EN fields + image, draft save/reload, canonical ownership and no live writes');

      for(const [width,lang] of [[1440,'th'],[820,'en'],[390,'th'],[320,'en']]){
        await page.setViewportSize({width,height:1000});await ready('/?lang='+lang);await fit();
        assert.deepEqual(await nameNodes().allTextContents(),Array(3).fill('CMS_TEST_NAME_'+lang.toUpperCase()));
        assert.equal(await page.locator('.hm-advisor-photo').count(),1);
        const photo=await page.locator('.hm-advisor-photo').boundingBox();assert.equal(photo.width,56);assert.equal(photo.height,70);
        assert.equal(await page.locator('.hm-advisor-photo').evaluate(n=>n.complete&&n.naturalWidth>0),true);
        assert.equal(await page.locator('.hm-proof details,.hm-proof button').count(),0);
        if(width<768){
          const cta=await page.locator('[data-hero-line]').boundingBox(),proof=await page.locator('.hm-proof').boundingBox();
          assert.ok(proof.y>=cta.y+cta.height,'Mobile proof follows Hero CTA');
        }
        if(lang==='th'){
          assert.equal(await page.locator('footer').innerHTML(),baseline.footer,'Footer not personalized');
          assert.equal(await page.locator('#talk form').innerHTML(),baseline.form,'No form markup changes from profile');
          assert.equal(await page.locator('.hm-licence-grid').innerHTML(),baseline.licences,'Company cards unchanged');
          for(const [name,selector] of [['hero','[data-home-section="hero"]'],['contact','#talk'],['licences','#licences']]){
            await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
            const clip=await page.locator(selector).boundingBox();
            await page.screenshot({path:`${out}/synthetic-layout-${width}-${name}.png`,fullPage:true,clip});
          }
        }
        checks.push(`${width}px ${lang}: three canonical names, one small image, unchanged form/footer/licences, no overflow`);
      }
      await ready('/motor');assert.equal(await nameNodes().count(),0);assert.equal(await page.locator('.hm-advisor-photo,.cm-contact-advisor,.hm-licence-advisor').count(),0);
      assert.equal(await page.locator('.hm-proof-details').count(),1,'Motor disclosure retained');
      draft.config.advisor.fullName.en='';await ready('/?lang=en');assert.equal(await nameNodes().count(),0);assert.equal(await page.locator('.hm-advisor-photo').count(),0);
      draft.config.advisor.photo='';await ready('/?lang=th');assert.equal(await nameNodes().count(),3);assert.equal(await page.locator('.hm-advisor-photo').count(),0);
      draft.config.advisor.fullName.en='CMS_LONG_NAME_'.repeat(10);
      draft.config.advisor.role.en='CMS_LONG_ROLE_'.repeat(10);
      draft.config.advisor.photo='assets/missing-advisor-fixture.png';
      await ready('/?lang=en');await fit();
      await page.waitForFunction(()=>document.querySelector('.hm-advisor-photo')?.hasAttribute('data-failed'));
      assert.equal(await page.locator('.hm-advisor-photo').isVisible(),false,'Failed optional image has no broken placeholder');
      draft.config.advisor.contactBefore.en='';draft.config.advisor.contactAfter.en='';
      await ready('/?lang=en');assert.equal(await page.locator('.cm-contact-advisor').count(),0,'Blank intro fragments restore original section copy');
      draft=structuredClone(live);await ready();assert.equal(await nameNodes().count(),0);
      checks.push('Motor unchanged; blank translation/name/photo/intro fallback; long names; failed image; restoration to actual CMS data');
      assert.deepEqual(errors,[]);
      fs.writeFileSync(`${out}/report.json`,JSON.stringify({passed:true,checks,saves,errors,network:'Loopback only, synthetic data in memory; no publish or real enquiries.'},null,2));
      console.log(JSON.stringify({passed:true,checks,saves},null,2));
    } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
  }
}
