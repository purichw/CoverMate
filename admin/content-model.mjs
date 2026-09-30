import { canEditContent } from '../covermate-roles.mjs';
import { ownerPathForMode, HISTORY_LIMIT } from '../covermate-contract.js';

export const CMS_VERSION_LIMIT = HISTORY_LIMIT;
const canonical = value => JSON.stringify(value, (_, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
  ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry);
const validDocument = value => value === null || !!(value?.config && Array.isArray(value.config.sections));
export function cmsDate(value) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value?.seconds !== undefined ? value.seconds * 1000 : value);
  return value && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

// Read the authoritative documents without hydrating or overwriting an editor's local draft.
export async function loadCmsOverview(client) {
  if (typeof client?.loadSiteState !== 'function' || typeof client?.loadVersions !== 'function') {
    throw new Error('ยังเชื่อมต่อข้อมูล CMS ไม่ได้ กรุณาลองอีกครั้ง');
  }
  const [live, draft, history] = await Promise.allSettled([
    client.loadSiteState('live', { source: 'server' }), client.loadSiteState('draft', { source: 'server' }), client.loadVersions(CMS_VERSION_LIMIT, { source: 'server' })
  ]);
  const liveOk = live.status === 'fulfilled' && validDocument(live.value);
  const draftOk = draft.status === 'fulfilled' && validDocument(draft.value);
  const historyOk = history.status === 'fulfilled' && Array.isArray(history.value);
  let draftState = 'unknown';
  if (draftOk && !draft.value) draftState = 'missing';
  else if (liveOk && draftOk) draftState = live.value && canonical({ config: live.value.config, text: live.value.text || {} }) === canonical({ config: draft.value.config, text: draft.value.text || {} }) ? 'synced' : 'changed';
  return {
    loading: false, connected: liveOk && draftOk && historyOk,
    error: liveOk && draftOk && historyOk ? '' : 'อ่านข้อมูล CMS บางส่วนไม่สำเร็จ กรุณาลองอีกครั้ง',
    checkedAt: new Date().toISOString(), draftState,
    publishedAt: liveOk ? cmsDate(live.value?.updatedAt) : null,
    draftUpdatedAt: draftOk ? cmsDate(draft.value?.updatedAt) : null,
    versionCount: historyOk ? history.value.length : null, versionLimit: CMS_VERSION_LIMIT
  };
}

export function cmsHubLinks(role, search = '') {
  const readonly = !canEditContent(role);
  const editor = (tab, section, group) => {
    const url = new URL(ownerPathForMode('admin', 'home', search), 'https://covermate.invalid');
    url.searchParams.set('cms_tab', tab);
    if (section) url.searchParams.set('cms_section', section);
    if (group) url.searchParams.set('cms_group', group);
    return url.pathname + url.search;
  };
  const editPath = ownerPathForMode('edit', 'home', search);
  const previewPath = ownerPathForMode('preview', 'home', search);
  const historyPath = editor('versions');
  const editable = (label, href, extra = {}) => ({ label, href, badge: readonly ? 'ดูอย่างเดียว' : 'แก้ไขได้', tone: 'editable', disabled: readonly, ...extra });
  return {
    readonly, previewPath, historyPath,
    tools: [
      { id: 'edit', title: 'แก้ไขเนื้อหา', description: 'จัดการข้อความ รูปภาพ และเนื้อหาบนเว็บไซต์ ผ่านเครื่องมือ CMS ได้อย่างง่ายดาย', actionLabel: 'เริ่มแก้ไขเนื้อหา', href: editPath, disabled: readonly },
      { id: 'preview', title: 'Preview ฉบับร่าง', description: 'ดูตัวอย่างหน้าเว็บไซต์ก่อนเผยแพร่ ตรวจสอบความถูกต้องในทุกอุปกรณ์', actionLabel: 'เปิดดูตัวอย่าง', href: previewPath },
      { id: 'history', title: 'เวอร์ชันที่เผยแพร่แล้ว', description: 'ดูประวัติการเผยแพร่ และนำเวอร์ชันก่อนหน้ากลับมาเป็นฉบับร่าง', actionLabel: 'ดูประวัติทั้งหมด', href: historyPath, disabled: readonly }
    ],
    groups: [
      { id: 'content', title: 'เนื้อหาและข้อความ', description: 'จัดการเนื้อหาหลักที่แสดงบนเว็บไซต์', icon: 'file', items: [
        editable('หน้าแรก', editor('sections', 'hero')), editable('เกี่ยวกับเรา', editor('content', 'about')),
        editable('รายละเอียดบริการ', editor('content', 'cover')), editable('บทความ / ข่าวสาร', '', { action: 'cms-articles', disabled: false, badge: readonly ? 'ดูอย่างเดียว' : 'จัดการบทความ' }),
        editable('คำถามที่พบบ่อย (FAQ)', editor('content', 'faq')), editable('แบบฟอร์มติดต่อ', editor('sections', 'talk'))
      ] },
      { id: 'brand', title: 'แบรนด์และติดต่อ', description: 'ข้อมูลธุรกิจ การติดต่อ และภาพลักษณ์องค์กร', icon: 'image', items: [
        editable('ข้อมูลและรูปที่ปรึกษา', editor('brand', '', 'credentials')), editable('โลโก้และภาพแบรนด์', editor('brand', '', 'identity')),
        editable('ช่องทางติดต่อ / โซเชียล', editor('brand', '', 'contact')), editable('เวลาทำการ', editor('brand', '', 'hours')),
        editable('จุดแสดงผลและส่วนท้ายเว็บไซต์', editor('brand', '', 'display'))
      ] },
      { id: 'legal', title: 'กฎหมายและความน่าเชื่อถือ', description: 'ข้อมูลที่สร้างความมั่นใจให้กับลูกค้า', icon: 'shield', items: [
        editable('ข้อมูลส่วนบุคคลและความยินยอม', editor('content', 'privacy')), editable('โลโก้บริษัทประกัน', editor('content', 'insurers')),
        editable('เลขใบอนุญาตและบทบาท', editor('brand', '', 'credentials')),
        editable('การเปิดเผยค่าตอบแทน', editor('content', 'fees')),
        editable('ข้อมูลและเงื่อนไขการเคลม', editor('content', 'claim'))
      ] },
      { id: 'structure', title: 'โครงสร้างและการแสดงผล', description: 'การตั้งค่าเว็บไซต์และองค์ประกอบหลัก', icon: 'settings', items: [
        editable('เมนูและลิงก์นำทาง', editor('brand', '', 'Navigation')), editable('ลำดับและการแสดงส่วนต่าง ๆ', editor('sections')),
        editable('ธีม สี และ SEO', editor('theme')), editable('สำรองและนำเข้าข้อมูล', editor('theme')),
        { label: 'Layout และองค์ประกอบหลัก', badge: 'แก้ผ่านโค้ด', tone: 'code' }
      ] }
    ]
  };
}
