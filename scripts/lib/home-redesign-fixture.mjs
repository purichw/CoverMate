import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { importCoverMateContract } from './contract-loader.mjs';

// Explicit local proposal only. This module has no remote read/write capability.
export async function createHomeFixture(packageRoot) {
  if (!packageRoot) throw new Error('Provide the reviewed handoff directory.');
  const read = file => JSON.parse(fs.readFileSync(path.join(packageRoot, file), 'utf8'));
  const source = read('source-handoff/04-home-public-cms.json');
  const contract = await importCoverMateContract();
  const normalized = contract.sanitizeStateDoc({ config: source.config, text: source.publishedInlineOverrides });
  const adopted = contract.adaptLegacyHomeCopy(normalized.config, normalized.text);
  const config = structuredClone(adopted.config);
  const changes = [], omitted = [];
  const hash = value => createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
  const set = (owner, value, reason) => {
    const oldValue = contract.cmsGet(config, owner);
    changes.push({ owner, oldValue, oldValueHash:hash(oldValue), proposedValue:value, reason });
    contract.cmsSet(config, owner, value);
  };
  const aliases = {
    'publicCopy.aboutReadMore':'homeDesign.detailsLabel', 'publicCopy.motorPageLink':'homeDesign.motorLabel',
    'publicCopy.tiersAll':'homeDesign.comparisonLabel', 'publicCopy.tierDetail':'homeDesign.detailsLabel',
    'publicCopy.contactMore':'homeDesign.optionalLabel', 'ui.submitUncertain':'homeDesign.uncertainError',
    'publicCopy.menuOpen':'homeDesign.menuLabel', 'publicCopy.menuClose':'homeDesign.closeLabel'
  };
  for (const entry of read('contracts/COPY_DECK_TH_EN.json').entries) {
    const logical = entry.owner_path_logical.replace(/^config\./, '').replace(/sections\[id=([^\]]+)\]/g, 'sections.@$1');
    if (logical.startsWith('sections.@guides.')) { omitted.push({id:entry.id,reason:'Owner retired the Guides section; its items now belong to FAQ.'}); continue; }
    const base = logical.replace('.{th,en}', '');
    const owner = aliases[base] || base;
    const isSection = owner.startsWith('sections.@');
    if (!isSection && !contract.CMS_CONTENT_FIELDS.some(field => field.path === owner)) { omitted.push({id:entry.id,reason:'No rendered owner; proposal retained in the original handoff.'}); continue; }
    for (const lang of ['th','en']) {
      const target = isSection ? logical.replace('{th,en}',lang) : owner + '.' + lang;
      let value = entry[lang];
      const count = config.sections.find(section => section.id === 'insurers').items.filter(item => item.on !== false).length;
      value = value.replace(/\{\{motorInsurerCount\}\}/g,String(count));
      set(target,value,entry.reason);
    }
  }
  const tiers = config.sections.find(section => section.id === 'tiers');
  set('footer.columns',4,'Four compact desktop columns match the reference; the existing Admin control remains authoritative.');
  set('sections.@hero.th.title','ความเสี่ยง\nไม่จำเป็นต้องจัดการ\nเพียงลำพัง','Reference headline line grouping; words unchanged.');
  set('sections.@cover.cols',6,'Desktop six-category gateway; tablet and mobile use responsive caps.');
  for (const [label, asset] of Object.entries({'Class 1':'1','Class 2+':'2-plus','Class 3+':'3-plus'})) {
    const item = tiers.items.find(item => item.en.label === label);
    if (item) set('sections.@tiers.items.@' + item.id + '.illustration','assets/brand/home-tier-' + asset + '-v1.webp','Owner-requested artwork adapted from the supplied tier reference; decorative, not coverage copy.');
  }
  set('homeDesign.featuredTierIds', tiers.items.filter(item => ['Class 1','Class 2+','Class 3+'].includes(item.en.label)).map(item => item.id), 'Featured choices mapped to existing IDs in this draft, not runtime label matching.');
  set('homeDesign.previewAxisIds', tiers.heads.slice(0,3).map(head => head.id), 'Three existing axes for the compact preview; complete matrix remains available.');
  set('homeDesign.taskLinks', [{id:'task-policy-review',on:true,label:{th:'ตรวจกรมธรรม์เดิม',en:'Review an existing policy'},target:'#review'}], 'Task shortcut is separate from the six coverage categories.');
  const order=['hero','trust','cover','about','review','how','insurers','tiers','claim','talk','renew','faq','fees','privacy'];
  const sections = [...order.map(id=>config.sections.find(section=>section.id===id)).filter(Boolean),...config.sections.filter(section=>!order.includes(section.id))];
  set('sections',sections,'Proposed local draft arrangement; production order is not changed by rendering.');
  for (const [id,bg] of Object.entries({hero:'surface',trust:'surface',cover:'bg',about:'surface',review:'surface',how:'surface',talk:'sage',renew:'bg',faq:'bg',fees:'surface',privacy:'bg'})) set('sections.@'+id+'.bg',bg,'Proposed section material from the approved direction.');
  return { state:{config,text:adopted.text,revision:1}, original:{config:source.config,text:source.publishedInlineOverrides,revision:1}, proposal:{status:'LOCAL_DRAFT_NOT_PUBLISHED',changes,omitted,source:source.provenance} };
}
