import { CMS_CONTENT_FIELDS, cmsGet, cmsMedia } from './covermate-contract.js';
import { validContactEmail, validPhone, validLineId } from './field-validation.mjs';

const fields = new Map(CMS_CONTENT_FIELDS.flatMap(field => (field.localized ? ['th', 'en'].map(lang => `${field.path}.${lang}`) : [field.path]).map(path => [path, field])));
export function cmsFieldLimit(path, field = fields.get(path) || {}) {
  if (/^(?:motorPage\.)?seo\.title\./.test(path)) return 68;
  if (/^(?:motorPage\.)?seo\.description\./.test(path)) return 155;
  if (/^brand\.credential\./.test(path)) return 180;
  if (/^(?:brand\.advisorLogoAlt|contact\.facebookName)$/.test(path) || /\.(?:photoAlt|logoAlt)$/.test(path)) return 120;
  if (/^contact\.(?:lineId|whatsapp|phone)$/.test(path)) return 80;
  if (path === 'contact.email') return 254;
  if (/\.nav\.\d+\.label\./.test(path)) return 80;
  if (/^homeDesign\.taskLinks\..*\.label\./.test(path)) return 160;
  if (/\.cellRemarks\..*\.(th|en)$/.test(path)) return 1000;
  if (/^footer\.legal\./.test(path)) return 2000;
  return field.media || field.url ? 500 : fields.has(path) ? 2000 : 10000;
}

export function cmsFieldError(path, value, field = fields.get(path) || {}) {
  if (typeof value !== 'string') return 'กรอกข้อมูลเป็นข้อความ';
  if (value.length > cmsFieldLimit(path, field)) return `ไม่เกิน ${cmsFieldLimit(path, field)} ตัวอักษร ข้อความยังอยู่ครบ กรุณาย่อก่อนบันทึก`;
  const text = value.trim();
  if (!text) return '';
  if ((field.email || path === 'contact.email') && !validContactEmail(text)) return 'กรอกอีเมลให้ถูกต้อง หรือเว้นว่าง';
  if (/^contact\.(phone|whatsapp)$/.test(path) && !validPhone(text)) return 'กรอกเบอร์โทร 7–15 หลัก ใช้ + และรหัสประเทศได้';
  if (path === 'contact.lineId' && !validLineId(text)) return 'LINE ID ใช้ตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง และขีดล่าง';
  if (field.media && !cmsMedia(text)) return 'ใช้ Path แบบ assets/... หรือ URL รูปที่ขึ้นต้นด้วย HTTPS';
  if (field.url || /^contact\.(lineUrl|facebookUrl)$/.test(path)) {
    try { if (new URL(text).protocol !== 'https:') throw new Error(); } catch { return 'กรอก URL ที่ขึ้นต้นด้วย HTTPS ให้ถูกต้อง หรือเว้นว่าง'; }
  }
  if ((field.nav || /\.nav\.\d+\.href$/.test(path) || /^homeDesign\.taskLinks\..*\.target$/.test(path)) && !/^(#[A-Za-z0-9_-]+|\/(?:motor|health|life)?(?:#[A-Za-z0-9_-]+)?)$/.test(text)) return 'ใช้ลิงก์ส่วนของหน้า เช่น #talk หรือ /motor, /health และ /life';
  return '';
}

export function cmsStateIssues(state) {
  const issues = [], add = (path, message) => { if (issues.length < 20) issues.push({path, message, label: fields.get(path)?.label || path}); };
  if (!state?.config || !Array.isArray(state.config.sections) || !state.text || typeof state.text !== 'object' || Array.isArray(state.text)) return [{path:'config',message:'ข้อมูลหน้าเว็บไม่ครบ กรุณาใช้ไฟล์สำรองจากระบบ'}];
  try { if (new TextEncoder().encode(JSON.stringify(state)).length > 750000) add('config','ข้อมูลหน้าเว็บใหญ่เกิน 750 KB กรุณาลดเนื้อหาหรือรูปแบบฝังไฟล์'); }
  catch { return [{path:'config',message:'รูปแบบข้อมูลไม่ถูกต้อง'}]; }
  let count = 0;
  const visit = (value, path = '', depth = 0) => {
    if (++count > 30000 || depth > 24) { add(path,'ข้อมูลซับซ้อนเกินไป'); return; }
    if (typeof value === 'string') { const message = cmsFieldError(path,value); if (message) add(path,message); return; }
    if (typeof value === 'number' && !Number.isFinite(value)) add(path,'กรอกตัวเลขที่มีค่าจำกัด');
    if (!value || typeof value !== 'object') return;
    const max = path === 'homeDesign.taskLinks' ? 20 : /^homeDesign\.(featuredTierIds|previewAxisIds)$/.test(path) ? 50 : /^pageLayout\.[^.]+\.order$/.test(path) ? 100 : 1000;
    if (Array.isArray(value) && value.length > max) { add(path,`รองรับไม่เกิน ${max} รายการ`); return; }
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__','prototype','constructor'].includes(key)) { add(path,'ชื่อฟิลด์ไม่ถูกต้อง'); continue; }
      visit(child,path ? `${path}.${key}` : key,depth+1);
    }
  };
  visit(state.config);
  for (const [path, field] of fields) {
    const value = cmsGet(state.config,path);
    if (value !== undefined && typeof value !== 'string') add(path,'กรอกข้อมูลเป็นข้อความ');
  }
  for (const [key,value] of Object.entries(state.text)) {
    const path = key.startsWith('cms:') ? key.slice(4) : key;
    const message = cmsFieldError(path,value);
    if (message) add(path,message);
  }
  return issues;
}

export function assertCmsState(state) {
  const fields = cmsStateIssues(state);
  if (fields.length) throw Object.assign(new Error(`${fields[0].label || fields[0].path}: ${fields[0].message}`), {status:422,code:'invalid_content',fields});
  return state;
}
