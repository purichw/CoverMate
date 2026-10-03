import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { fillClaimGuidanceExamples } from './lib/claim-guidance-content.mjs';
const { isPlaceholderStoryItem } = await importCoverMateContract();

const legacyDefaults = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const legacyExamples = structuredClone(legacyDefaults);
legacyExamples.sections[legacyExamples.sections.findIndex(section=>section.id==='voices')] = structuredClone(legacyDefaults.sections.find(section=>section.id==='voices'));
legacyExamples.cmsContentVersion = 26;
const legacyVoices = legacyExamples.sections.find(section=>section.id==='voices');
legacyVoices.items.forEach((item,index)=>{item.id='preserved-example-'+index;item.on=index!==1;});
const legacyBefore=structuredClone(legacyExamples);
const filledExamples=fillClaimGuidanceExamples(legacyExamples).config;
const examples=filledExamples.sections.find(section=>section.id==='voices');
assert.equal(examples.on,false,'Adding examples never enables the section');
assert.deepEqual(examples.items.map(item=>[item.id,item.on]),legacyVoices.items.map(item=>[item.id,item.on]),'Content fill preserves stable IDs and individual visibility');
assert.equal(examples.items.length,3,'Exactly the three existing seed rows become examples');
for(const lang of ['th','en']) {
  assert.equal(new Set(examples.items.map(item=>item[lang].title)).size,3,'Three distinct '+lang+' scenarios');
  for(const item of examples.items) {
    assert.equal(isPlaceholderStoryItem(item,lang),false,'Labelled illustrative copy is publishable, not a pending placeholder');
    assert.match(item[lang].label,lang==='th'?/ตัวอย่างสถานการณ์/:/Illustrative scenario/);
    assert.match(item[lang].valueNote,lang==='th'?/ไม่ใช่เคสลูกค้าจริง/:/Not a real customer case/);
  }
}
assert.deepEqual(filledExamples.sections.filter(section=>section.id!=='voices'),legacyBefore.sections.filter(section=>section.id!=='voices'),'Example content fill leaves all other sections intact');
for(const key of Object.keys(legacyBefore).filter(key=>key!=='sections'))assert.deepEqual(filledExamples[key],legacyBefore[key],'Example content fill leaves '+key+' intact');
assert.deepEqual(legacyExamples,legacyBefore,'Example content fill never mutates input');
assert.deepEqual(fillClaimGuidanceExamples(filledExamples).config,filledExamples,'Example content fill is idempotent');
examples.items.reverse();
assert.deepEqual(fillClaimGuidanceExamples(filledExamples).config.sections.find(section=>section.id==='voices').items,examples.items,'Subsequent reads preserve reordered example IDs and copy');

const mixedExamples=structuredClone(legacyBefore), mixedVoices=mixedExamples.sections.find(section=>section.id==='voices');
mixedVoices.on=true;
mixedVoices.th.title='หัวข้อที่เจ้าของแก้';
mixedVoices.items[0].th.body='เนื้อหาของเจ้าของ';
mixedVoices.items[1].en.body='';
mixedVoices.items[2].th.extra='custom metadata';
const mixedBefore=structuredClone(mixedExamples);
const mixedFilled=fillClaimGuidanceExamples(mixedExamples).config.sections.find(section=>section.id==='voices');
assert.equal(mixedFilled.on,true,'Enabled owner state remains enabled');
assert.deepEqual(mixedFilled.th,mixedBefore.sections.find(section=>section.id==='voices').th,'An edited section locale bucket is preserved in full');
assert.deepEqual(mixedFilled.items[0].th,mixedVoices.items[0].th,'One authored field preserves its entire locale bucket');
assert.notDeepEqual(mixedFilled.items[0].en,mixedVoices.items[0].en,'An untouched translation can be filled independently');
assert.deepEqual(mixedFilled.items[1].en,mixedVoices.items[1].en,'A deliberately blank field prevents content fill of that locale');
assert.deepEqual(mixedFilled.items[2].th,mixedVoices.items[2].th,'Additional owner fields prevent a false exact seed match');
assert.deepEqual(mixedExamples,mixedBefore);
for(const items of [[],[{}],[{th:{},en:{}}],[{th:'',en:null}]]) {
  const blank=structuredClone(legacyBefore), blankVoices=blank.sections.find(section=>section.id==='voices');
  blankVoices.items=items;
  assert.deepEqual(fillClaimGuidanceExamples(blank).config.sections.find(section=>section.id==='voices'),blankVoices,'Empty or explicitly cleared content is never reseeded');
}
const currentPending=structuredClone(legacyBefore);
currentPending.cmsContentVersion=999;
assert.equal(fillClaimGuidanceExamples(currentPending).config.cmsContentVersion,999,'A content-only update never changes schema version');
const deletedExamples=structuredClone(legacyBefore);
deletedExamples.sections=deletedExamples.sections.filter(section=>section.id!=='voices');
assert.deepEqual(fillClaimGuidanceExamples(deletedExamples).config.sections,deletedExamples.sections,'A deliberately removed claims section is never recreated');

assert.equal(fillClaimGuidanceExamples(legacyBefore).changedPaths.length,8,'Audit lists six item locale buckets and two section buckets');
assert.deepEqual(fillClaimGuidanceExamples(filledExamples).changedPaths,[],'Repeated preparation has no writes to apply');
assert.deepEqual(fillClaimGuidanceExamples({sections:[]}).changedPaths,[],'Missing section has no proposed writes');

const oldTestimonials = {
  id:'voices',type:'testimonials',on:false,bg:'cream',cols:3,extra:{keep:true},
  th:{kicker:'เสียงจากลูกค้า',title:'ยังไม่ได้ใส่รีวิวจริง',body:'สามช่องนี้เป็นตัวอย่างให้เห็นโครง เปลี่ยนข้อความและรูปได้ในแอดมิน',note:'ทุกเคสต้องขออนุญาตลูกค้าก่อนเผยแพร่ ไม่ระบุชื่อ ไม่ใช้รูปจริง และตัวเลขต้องตรงกับเอกสารเคลม — เคสของคนอื่นไม่ได้แปลว่าเคสคุณจะออกมาเหมือนกัน'},
  en:{kicker:'Client voices',title:'Real reviews not added yet',body:'These three are placeholders showing the shape. Swap the words and photos in the admin portal.',note:'Every case needs the client’s permission before it goes up: no names, no real photographs, and figures that match the claim documents. Another person’s outcome is not a promise about yours.'},
  items:[0,1,2].map(index=>({id:'legacy-'+index,on:index!==1,img:'',extra:'retain',
    th:{quote:index===0?'⟨ใส่คำรีวิวจริงตรงนี้ — 1 ถึง 2 ประโยคจะอ่านง่ายที่สุด⟩':'⟨ใส่คำรีวิวจริงตรงนี้⟩',name:'⟨ชื่อลูกค้า⟩',meta:'⟨อาชีพ · ประกันที่ทำ⟩'},
    en:{quote:index===0?'⟨Paste a real quote here — one or two sentences reads best⟩':'⟨Paste a real quote here⟩',name:'⟨Client name⟩',meta:'⟨Occupation · policy held⟩'}
  }))
};
const oldTestimonialConfig={cmsContentVersion:9,sections:[oldTestimonials,{id:'other',on:true}],untouched:{keep:true}};
const oldTestimonialBefore=structuredClone(oldTestimonialConfig);
const testimonialResult=fillClaimGuidanceExamples(oldTestimonialConfig);
assert.equal(testimonialResult.changedPaths.length,9,'Legacy testimonials audit includes the explicit type conversion');
assert.equal(testimonialResult.config.sections[0].type,'stories');
assert.equal(testimonialResult.config.sections[0].on,false,'Content preparation never enables a legacy testimonial section');
const metadata=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!['type','th','en','items'].includes(key)));
assert.deepEqual(metadata(testimonialResult.config.sections[0]),metadata(oldTestimonials),'All non-copy section metadata remains intact');
assert.deepEqual(testimonialResult.config.sections[0].items.map(metadata),oldTestimonials.items.map(metadata),'IDs, visibility, images and custom item metadata remain intact');
assert.deepEqual({...testimonialResult.config,sections:[]},{...oldTestimonialConfig,sections:[]},'No schema or unrelated config fields change');
assert.deepEqual(testimonialResult.config.sections[1],oldTestimonialConfig.sections[1]);
assert.deepEqual(oldTestimonialConfig,oldTestimonialBefore,'Preparation never mutates legacy input');
assert.deepEqual(fillClaimGuidanceExamples(testimonialResult.config),{config:testimonialResult.config,changedPaths:[]},'Converted testimonials are idempotent');
for(const edit of [
  s=>{s.th.title='authored';}, s=>{s.items[0].en.quote='Real feedback';},
  s=>{s.items[1].th.quote='';}, s=>{s.items[2].en.extra='authored';},
  s=>{delete s.items[1].th;}, s=>{s.items=[];}, s=>{s.items.pop();},
  s=>{s.items.push(structuredClone(s.items[0]));}, s=>{s.items[0].th=null;}
]) {
  const custom=structuredClone(oldTestimonialConfig); edit(custom.sections[0]);
  assert.deepEqual(fillClaimGuidanceExamples(custom),{config:custom,changedPaths:[]},'Any non-exact legacy testimonial copy blocks the whole type conversion');
}
console.log('Claim guidance content preparation checks passed. No database writes.');
