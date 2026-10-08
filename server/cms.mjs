import { createHash } from 'node:crypto';
import { serverDb } from './firebase.cjs';
import { error } from './http.cjs';
import { sanitizeStateDoc, validStateDoc } from '../covermate-contract.js';
import { assertCmsState } from '../cms-validation.mjs';

export async function mutateCms(actor, body, db = serverDb()) {
  if (!body || !['save','publish','reset','version'].includes(body.action) || !/^[\w-]{20,80}$/.test(body.requestId || '')) throw error(422,'invalid_body','คำขอบันทึกไม่ถูกต้อง');
  const {action,requestId} = body, site = actor.env.siteId;
  if (action === 'save' && !['draft','live'].includes(body.name)) throw error(422,'invalid_state','ไม่พบฉบับที่ต้องการบันทึก');
  let clean;
  if (action !== 'reset') clean = sanitizeStateDoc(assertCmsState({config:body.config,text:body.text || {}}),{repeatableIds:true});
  const metadata = body.metadata || {};
  if (typeof metadata !== 'object' || Array.isArray(metadata) || Object.entries(metadata).some(([key,value]) => !['undoOf','restoredFrom'].includes(key) || typeof value !== 'string' || value.length > 160)) throw error(422,'invalid_metadata','ข้อมูลประวัติไม่ถูกต้อง');
  const fingerprint = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const receipt = db.doc(`sites/${site}/cmsMutations/${actor.uid}-${requestId}`);
  const liveRef = db.doc(`sites/${site}/states/live`), draftRef = db.doc(`sites/${site}/states/draft`);
  const versionRef = db.doc(`sites/${site}/versions/${requestId}`);
  return db.runTransaction(async tx => {
    const previous = (await tx.get(receipt)).data();
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw error(409,'request_conflict','คำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว กรุณาโหลดข้อมูลล่าสุด');
      return previous.result;
    }
    const live = (await tx.get(liveRef)).data(), draft = (await tx.get(draftRef)).data();
    const revision = name => {
      const actual = Number((name === 'live' ? live : draft)?.revision || 0);
      if (!Number.isSafeInteger(body.revisions?.[name]) || body.revisions[name] !== actual) throw error(409,'content-conflict','มีการแก้ไขจากอีกหน้าต่าง งานของคุณยังอยู่ กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก');
      return actual + 1;
    };
    const by = {uid:actor.uid,email:actor.email || '',role:actor.role || 'admin'}, ts = Date.now(), revisions = {};
    let result;
    if (action === 'reset') {
      if (!validStateDoc(live)) throw error(409,'no_live','ยังไม่มีเวอร์ชันที่ Publish ให้ Reset กรุณาเก็บ Draft นี้ไว้ก่อน');
      // Published legacy snapshots remain restorable; new edits use strict validation.
      clean = sanitizeStateDoc(live,{repeatableIds:true});
      revisions.draft = revision('draft'); revisions.live = Number(live.revision || 0);
      result = {config:clean.config,text:clean.text,revisions};
      tx.set(draftRef,{config:clean.config,text:clean.text,revision:revisions.draft,updatedAt:new Date(ts),updatedBy:by});
    } else {
      if (action === 'publish') { revisions.live = revision('live'); revisions.draft = revision('draft'); }
      if (action === 'save') revisions[body.name] = revision(body.name);
      for (const [name,value] of Object.entries(revisions)) tx.set(name === 'live' ? liveRef : draftRef,{...clean,revision:value,updatedAt:new Date(ts),updatedBy:by});
      const version = {id:requestId,...metadata,...clean,ts,createdBy:by};
      if (action === 'publish' || action === 'version') tx.create(versionRef,{...version,createdAt:new Date(ts)});
      result = {revisions,...(action === 'publish' || action === 'version' ? {version} : {})};
    }
    tx.create(receipt,{fingerprint,result,createdAt:new Date(ts)});
    return result;
  });
}
