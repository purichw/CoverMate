import { createElement, UsersRound, UserRound, UserRoundPlus, ShieldCheck, FileText, ClipboardCheck, History, Plus, ArrowLeft, ChevronRight, ChevronDown, CalendarDays, MapPin, Settings2, RefreshCw, Save, Search, LockKeyhole, Download, Upload, Eye, Link, X, Check, Phone, Mail, Pencil, Copy, List, Send } from 'lucide';
import { PROFILE_FIELDS, POLICY_FIELDS, CONSENT_FIELDS, SERVICE_FIELDS, SCOPES, emptyFields, fullName, hasConsent, validateProfile, validatePolicy, validateConsent, validateFields, validateIdentity, profileRelationErrors, consentRelationErrors } from '../../customer-model.mjs';

const icons = { users: UsersRound, user: UserRound, newCustomer: UserRoundPlus, policy: ShieldCheck, file: FileText, consent: ClipboardCheck, history: History, plus: Plus, back: ArrowLeft, next: ChevronRight, down: ChevronDown, calendar: CalendarDays, address: MapPin, settings: Settings2, refresh: RefreshCw, save: Save, search: Search, lock: LockKeyhole, download: Download, upload: Upload, eye: Eye, link: Link, close: X, check: Check, phone: Phone, email: Mail, edit: Pencil, copy: Copy, list: List, send: Send };
const icon = name => createElement(icons[name] || FileText, { width: 20, height: 20, 'stroke-width': 1.8, 'aria-hidden': 'true' }).outerHTML;
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = value => value ? new Intl.DateTimeFormat('th-TH-u-ca-gregory', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : 'ยังไม่ระบุ';
const badge = value => `<span class="customer-badge" data-status="${esc(value)}">${esc(value)}</span>`;
const button = (action, label, symbol, extra = '', primary = false) => `<button type="button" class="article-button ${primary ? 'article-create' : ''}" data-customer-action="${action}" ${extra}>${symbol ? icon(symbol) : ''}${label ? `<span>${esc(label)}</span>` : ''}</button>`;
const blank = (title, text, symbol = 'file', actions = '') => `<div class="customer-empty">${icon(symbol)}<h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}${actions}</div>`;
const tabs = [['profile','Profile','user'],['policies','Policies','policy'],['documents','Documents','file'],['consent','Consent','consent'],['history','Service History','history']];
const policyTypeLabels = { Life: 'ประกันชีวิต (Life)', Health: 'ประกันสุขภาพ (Health)', Motor: 'ประกันรถยนต์ (Motor)', Accident: 'ประกันอุบัติเหตุ (Accident)', Savings: 'ประกันสะสมทรัพย์ (Savings)', Other: 'ประกันอื่น ๆ (Other)' };
const policyEditorFields = POLICY_FIELDS.map(f => f.key === 'type' ? { ...f, optionLabels: policyTypeLabels } : f);
const profileGroups = [['ข้อมูลหลัก', ['firstName','lastName','nickname','language'], false, 'user'], ['ช่องทางติดต่อ', ['phone','email','lineId','preferredChannel'], false, 'phone'], ['ข้อมูลส่วนตัวเพิ่มเติม', ['firstNameEn','lastNameEn','birthDate','nationality','occupation','contactTime'], true, 'user'], ['ที่อยู่และบันทึก', ['address','postalCode','source','notes'], true, 'address'], ['การจัดเก็บข้อมูล', ['retentionReviewAt','status'], true, 'settings']];
const profileDescriptions = ['ชื่อและภาษาที่ลูกค้าสะดวก', 'เบอร์โทร อีเมล และ LINE', 'วันเกิด อาชีพ และข้อมูลเพิ่มเติม', 'ที่อยู่ ช่องทางที่มา และบันทึก', 'สถานะทะเบียนและวันทบทวนข้อมูล'];
const newCustomerPlaceholders = { firstName: 'กรอกชื่อ', lastName: 'กรอกนามสกุล', nickname: 'ชื่อที่ใช้เรียก', phone: 'กรอกเบอร์โทรศัพท์', email: 'name@example.com', lineId: 'กรอก LINE ID', firstNameEn: 'Enter first name', lastNameEn: 'Enter last name', nationality: 'กรอกสัญชาติ', occupation: 'กรอกอาชีพ', contactTime: 'เช่น 09:00–12:00 น.', address: 'กรอกที่อยู่ติดต่อ', postalCode: 'กรอกรหัสไปรษณีย์', source: 'เช่น Facebook, LINE หรือเพื่อนแนะนำ', notes: 'รายละเอียดเพิ่มเติมเกี่ยวกับลูกค้า', noticeVersion: 'เช่น CM-Privacy-v1', noticeText: 'ข้อความที่แจ้งลูกค้าจริง', evidence: 'เช่น ชื่อเอกสาร วันที่สนทนา หรือเลขอ้างอิง' };
const policyGroups = [['ข้อมูลกรมธรรม์', ['insurer','plan','policyNumber','type','status','source','agent'], false, 'policy'], ['บุคคลในกรมธรรม์', ['policyholder','insured','payer','beneficiaries'], true, 'users'], ['ระยะคุ้มครองและเบี้ยประกัน', ['issuedAt','startsAt','endsAt','premium','frequency','nextDueAt','renewalAt'], true, 'calendar'], ['ความคุ้มครอง', ['sumAssured','ipd','opd','room','deductible','copay','vehicle','riders','coverage','exclusions','notes'], true, 'policy']];
const fieldHints = {
  phone: 'ระบุเบอร์โทร อีเมล หรือ LINE อย่างน้อยหนึ่งช่องทาง',
  noticeVersion: 'รหัสหรือเวอร์ชันของข้อความที่แจ้งลูกค้าจริง',
  noticeText: 'ใช้ข้อความที่ลูกค้าได้รับแจ้งในวันที่ให้คำตอบ',
  retentionReviewAt: 'วันที่สำหรับทบทวนข้อมูล ไม่ใช่วันที่ลบอัตโนมัติ',
  followUpAt: 'บันทึกวันนัดเท่านั้น การแจ้งเตือนจัดการในงานติดต่อ',
  ipd: 'ระบุวงเงินและรอบความคุ้มครอง เช่น บาทต่อปี',
  opd: 'ระบุวงเงินต่อครั้งและจำนวนครั้ง ตามกรมธรรม์',
  room: 'ระบุวงเงินต่อวันและสกุลเงิน',
  copay: 'ระบุสัดส่วนหรือจำนวนเงินตามกรมธรรม์',
  postalCode: 'ไทยใช้ 5 หลัก หรือรหัสไปรษณีย์ของที่อยู่ต่างประเทศ',
  lineId: 'ใช้ LINE ID ไม่ใช่ชื่อที่แสดง'
};
const readFields = (form, definitions, prefix = '') => Object.fromEntries(definitions.map(f => [f.key, form.elements.namedItem(prefix + f.key)?.value || '']));
function field(f, value, prefix = '') {
  const name = prefix + f.key, id = `customer-${name.replaceAll('.', '-')}`;
  const hint = f.hint ?? fieldHints[f.key];
  const attributes = `id="${id}" name="${esc(name)}" data-field-label="${esc(f.label)}" aria-describedby="${id}-error${hint ? ` ${id}-hint` : ''}" ${f.required ? 'required' : ''} ${f.max ? `maxlength="${f.max}"` : ''}`;
  const placeholder = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
  const control = f.type === 'select' ? `<select ${attributes}><option value="">${f.required ? 'เลือกรายการ' : 'ยังไม่ระบุ'}</option>${f.options.map(o => `<option value="${esc(o)}" ${value === o ? 'selected' : ''}>${esc(f.optionLabels?.[o] || o)}</option>`).join('')}</select>` : f.type === 'textarea' ? `<textarea ${attributes} ${placeholder} rows="3">${esc(value)}</textarea>` : `<input ${attributes} ${placeholder} type="${f.type}" value="${esc(value)}" ${f.type === 'number' ? 'min="0" max="1000000000000" step="0.01" inputmode="decimal"' : ''}>`;
  return `<div class="customer-field ${f.type === 'textarea' ? 'wide' : ''}" data-field-type="${f.type}"><label for="${id}">${esc(f.label)}${f.required ? '<span aria-hidden="true"> *</span>' : ''}</label>${control}${hint ? `<small class="customer-field-hint" id="${id}-hint">${esc(hint)}</small>` : ''}<small class="customer-field-error" id="${id}-error" data-customer-field-error hidden></small>${f.type === 'textarea' && f.max ? `<small class="customer-field-count" data-customer-field-count>${value.length} / ${f.max}</small>` : ''}</div>`;
}
const fields = (defs, values = {}, prefix = '') => `<div class="customer-fields">${defs.map(f => field(f, values[f.key] || '', prefix)).join('')}</div>`;
const sectionTitle = (title, symbol) => `<span class="customer-section-title">${icon(symbol)}<span>${esc(title)}</span></span>`;
const formSection = (title, content, symbol = 'file') => `<section class="customer-form-section"><h3>${sectionTitle(title, symbol)}</h3>${content}</section>`;
const groups = (definitions, layout, values, prefix = '') => layout.map(([title, keys, collapsed, symbol = 'file']) => collapsed
  ? `<details class="customer-form-section customer-disclosure"><summary>${sectionTitle(title, symbol)}${icon('down')}</summary>${fields(keys.map(key => definitions.find(f => f.key === key)), values, prefix)}</details>`
  : formSection(title, fields(keys.map(key => definitions.find(f => f.key === key)), values, prefix), symbol)).join('');
const consentScopes = (initial = false) => `<fieldset class="customer-scopes"><legend>ขอบเขตที่ลูกค้ายินยอม *</legend>${Object.entries(SCOPES).map(([id, text]) => `<label><input name="scopes" type="checkbox" value="${id}" ${initial && id === 'profile' ? 'checked' : ''}>${text}</label>`).join('')}</fieldset>`;
const consentForm = (initial = false) => `${consentScopes(initial)}${fields(CONSENT_FIELDS, { status: 'Granted' }, 'consent.')}`;
const consentInput = form => ({ ...readFields(form, CONSENT_FIELDS, 'consent.'), scopes: [...form.querySelectorAll('[name=scopes]:checked')].map(el => el.value) });
const customerLanguages = { TH: 'TH · ภาษาไทย', EN: 'EN · English', Other: 'Other' };
const newCustomerFields = (defs, values, prefix = '') => fields(defs.map(f => ({ ...f, placeholder: newCustomerPlaceholders[f.key], ...(f.key === 'phone' ? { hint: '' } : {}), ...(f.key === 'language' ? { optionLabels: customerLanguages } : {}) })), values, prefix);
function newCustomerSection(index, title, description, symbol, content, open = false) {
  return `<details class="customer-new-section" data-customer-section="${index}" ${open ? 'open' : ''}><summary><span class="customer-section-number" aria-hidden="true">${index}</span><span class="customer-new-section-heading">${sectionTitle(title, symbol)}<span class="customer-section-description">${esc(description)}</span><span class="customer-section-progress" data-section-progress hidden></span></span><span class="customer-section-chevron">${icon('down')}</span></summary><div class="customer-new-section-body">${content}</div></details>`;
}
function newCustomerSections(values) {
  return profileGroups.map(([title, keys, collapsed, symbol], index) => newCustomerSection(index + 1, title, profileDescriptions[index], symbol, `${index === 1 ? '<p class="customer-contact-requirement">ระบุเบอร์โทร อีเมล หรือ LINE อย่างน้อยหนึ่งช่องทาง</p>' : ''}${newCustomerFields(keys.map(key => PROFILE_FIELDS.find(f => f.key === key)), values)}`, !collapsed)).join('')
    + newCustomerSection(6, 'หลักฐาน Consent', 'คำตอบและหลักฐานความยินยอมของลูกค้า', 'consent', `<div class="customer-new-consent"><div>${consentScopes(true)}<small class="customer-field-error" id="customer-scopes-error" data-scope-error hidden></small></div>${newCustomerFields(CONSENT_FIELDS.slice(0, 4), { status: 'Granted' }, 'consent.')}</div><div class="customer-new-consent-text">${newCustomerFields(CONSENT_FIELDS.slice(4), {}, 'consent.')}</div>`, true);
}
function customerSteps(current) {
  return `<ol class="customer-steps" aria-label="ขั้นตอนสร้างลูกค้า">${['กรอกข้อมูล', 'ตรวจสอบ', 'บันทึกสำเร็จ'].map((label, i) => {
    const complete = i + 1 < current;
    return `<li data-step-state="${complete ? 'complete' : i + 1 === current ? current === 3 ? 'success' : 'current' : 'pending'}" ${i + 1 === current ? 'aria-current="step"' : ''}><span class="customer-step-marker" aria-hidden="true">${complete ? icon('check') : i + 1}</span><span>${label}${complete ? '<span class="case-sr-only"> เสร็จแล้ว</span>' : ''}</span></li>`;
  }).join('')}</ol>`;
}
function reviewValue(value) {
  if (!value) return '<span class="customer-review-empty">ยังไม่ระบุ</span>';
  if (value.length <= 240) return esc(value);
  return `<details class="customer-review-long-text"><summary><span class="customer-review-excerpt">${esc(value.slice(0, 240))}…</span><span class="customer-review-read-more">อ่านข้อความทั้งหมด</span><span class="customer-review-read-less">ย่อข้อความ</span></summary><p>${esc(value)}</p></details>`;
}
function reviewRows(definitions, values, prefix = '') {
  return definitions.map(f => {
    const value = values[f.key] || '';
    const content = f.key === 'status' ? badge(value) : f.type === 'date' && value ? esc(date(value)) : reviewValue(f.key === 'language' ? customerLanguages[value] || value : value);
    return `<div data-review-field="${prefix + f.key}"><dt>${esc(f.label)}</dt><dd>${content}</dd></div>`;
  }).join('');
}
function reviewSection(index, title, symbol, content) {
  return `<article class="customer-review-section" data-review-section="${index}"><header><h3><button type="button" data-review-toggle="${index}" aria-expanded="true" aria-controls="customer-review-body-${index}">${sectionTitle(title, symbol)}${icon('down')}</button></h3><button type="button" class="customer-review-edit" data-review-edit="${index}" aria-label="แก้ไข${esc(title)}">${icon('edit')}<span>แก้ไข</span></button></header><dl id="customer-review-body-${index}">${content}</dl></article>`;
}
function customerReview({ profile, consent }) {
  const sections = profileGroups.map(([title, keys, , symbol], index) => reviewSection(index + 1, title, symbol, reviewRows(keys.map(key => PROFILE_FIELDS.find(f => f.key === key)), profile))).join('');
  const scopes = Object.entries(SCOPES).map(([key, label]) => `<div data-review-scope="${key}"><dt>${esc(label)}</dt><dd>${badge(consent.scopes.includes(key) ? consent.status : 'Not recorded')}</dd></div>`).join('');
  return `<h2 id="customer-review-title" tabindex="-1">ตรวจสอบข้อมูล</h2><div class="customer-review-ready"><span class="customer-ready-icon">${icon('check')}</span><div><strong>ข้อมูลที่จำเป็นครบแล้ว พร้อมยืนยันสร้างลูกค้า</strong><p>ข้อมูลยังไม่ถูกบันทึกในระบบ</p></div></div><div class="customer-review-grid">${sections}${reviewSection(6, 'หลักฐาน Consent', 'consent', scopes + reviewRows(CONSENT_FIELDS, consent, 'consent.'))}</div>`;
}

export function createCustomersWorkspace({ root, api, session, searchInput, openCase, canReuseList = () => false }) {
  const s = { active: false, record: null, tab: 'profile', rows: [], total: 0, offset: 0, nextOffset: null, status: 'Active', query: '', loading: false, error: '', dirty: false, busy: false, generation: 0, creating: false, sourceCase: null };
  let dialog = null, dialogDirty = false, searchTimer, requestKey, requestSignature;
  let listKey = null, listLoadedAt = 0;
  function invalidateList() { listKey = null; listLoadedAt = 0; s.rows = []; s.total = 0; s.nextOffset = null; s.generation++; }
  const permitted = ['owner','admin','administrator'].includes(session.role);
  const currentId = () => new URL(location.href).searchParams.get('customer');
  const route = id => { const url = new URL(location.href); id ? url.searchParams.set('customer', id) : url.searchParams.delete('customer'); url.searchParams.delete('fromCase'); url.hash = 'customers'; history.pushState(null, '', url.pathname + url.search + url.hash); };
  function paint(html) { root.classList.add('customers-screen'); root.innerHTML = html; }
  function message(text, error = false, target = root) { const box = target.querySelector('[data-customer-feedback]'); if (box) { box.textContent = text; box.dataset.error = String(error); box.hidden = !text; box.setAttribute('role', error ? 'alert' : 'status'); } }
  const feedback = '<div class="customer-feedback" data-customer-feedback hidden></div>';
  function saveState(target, state) {
    const status = target.querySelector('[data-customer-dirty]');
    if (status) { status.textContent = state; status.dataset.state = state; }
  }
  function fieldError(input, text = '') {
    if (!input) return;
    text ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid');
    const note = input.closest('.customer-field')?.querySelector('[data-customer-field-error]');
    if (note) { note.textContent = text; note.hidden = !text; }
    if (text) { const section = input.closest('details'); if (section) section.open = true; }
  }
  function bindFormState(form, dirty) {
    form.addEventListener('input', event => {
      dirty(); saveState(form, 'Unsaved changes'); fieldError(event.target);
      const count = event.target.closest('.customer-field')?.querySelector('[data-customer-field-count]');
      if (count) count.textContent = `${event.target.value.length} / ${event.target.maxLength}`;
    });
    form.addEventListener('invalid', event => {
      const input = event.target;
      fieldError(input, input.validity.valueMissing && input.dataset.fieldLabel ? `กรุณาระบุ${input.dataset.fieldLabel}` : input.validationMessage);
      saveState(form, 'Check required fields');
    }, true);
  }
  async function guard() {
    if (s.busy) return false;
    if (!s.dirty && !dialogDirty) return true;
    const ok = await confirm('ยังมีข้อมูลที่ไม่ได้บันทึก', 'ออกจากหน้านี้และทิ้งการแก้ไขที่ยังไม่ได้บันทึกหรือไม่?', 'ทิ้งการแก้ไข');
    if (ok) { s.dirty = false; dialogDirty = false; closeDialog(); }
    return ok;
  }
  function confirm(title, text, label = 'ยืนยัน') {
    return new Promise(resolve => {
      const el = document.createElement('dialog'); el.className = 'customer-dialog customer-confirm';
      el.setAttribute('aria-label', title);
      el.innerHTML = `<header><h2>${esc(title)}</h2></header><p>${esc(text)}</p><footer><button class="article-button" value="cancel" autofocus>ทำงานต่อ</button><button class="article-button article-create" value="confirm">${esc(label)}</button></footer>`;
      const finish = ok => { el.close(); el.remove(); resolve(ok); };
      el.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
      el.addEventListener('click', event => { const b = event.target.closest('button'); if (b) finish(b.value === 'confirm'); });
      document.body.append(el); el.showModal();
    });
  }
  function closeDialog() { dialog?.close(); dialog?.remove(); dialog = null; dialogDirty = false; }
  function openDialog(title, html, save, label = 'บันทึก', { symbol = 'file', submitIcon = 'save' } = {}) {
    closeDialog(); const origin = document.activeElement;
    dialog = document.createElement('dialog'); dialog.className = 'customer-dialog';
    dialog.setAttribute('aria-label', title);
    dialog.innerHTML = `<form autocomplete="off"><header><div class="customer-dialog-heading"><span class="customer-item-icon">${icon(symbol)}</span><div><h2>${esc(title)}</h2>${s.record ? `<p>${esc(fullName(s.record.profile))} <span class="customer-divider">/</span> ${esc(s.record.code)}</p>` : ''}</div></div>${button('dismiss', '', 'close', 'aria-label="ปิดหน้าต่าง" title="ปิดหน้าต่าง"')}</header><div class="customer-dialog-body">${html}${feedback}</div><footer><span class="customer-save-state" data-customer-dirty aria-live="polite"></span><div class="customer-dialog-actions">${button('dismiss','ยกเลิก')}<button class="article-button article-create" type="submit">${icon(submitIcon)}${esc(label)}</button></div></footer></form>`;
    const dismiss = async () => { if (s.busy) return; if (dialogDirty && !await confirm('ยังมีข้อมูลที่ไม่ได้บันทึก', 'ต้องการทิ้งข้อมูลในหน้าต่างนี้หรือไม่?', 'ทิ้งการแก้ไข')) return; closeDialog(); origin?.focus(); };
    dialog.addEventListener('cancel', e => { e.preventDefault(); dismiss(); });
    dialog.addEventListener('click', e => { if (e.target.closest('[data-customer-action=dismiss]')) dismiss(); });
    bindFormState(dialog.querySelector('form'), () => { dialogDirty = true; });
    dialog.addEventListener('submit', async e => { e.preventDefault(); try { await save(e.target); } catch { saveState(e.target, 'Save failed'); message('บันทึกไม่ได้ กรุณาลองอีกครั้ง ข้อมูลที่กรอกยังอยู่', true, e.target); } });
    document.body.append(dialog); dialog.showModal();
  }
  async function mutate(path, body, method = 'POST', target = dialog || root) {
    if (s.busy) return null;
    const signature = JSON.stringify({ path, body, method });
    if (signature !== requestSignature) { requestSignature = signature; requestKey = crypto.randomUUID(); }
    s.busy = true; s.lastError = ''; target.setAttribute('aria-busy','true');
    const controls = [...target.querySelectorAll('button,input,select,textarea')].filter(el => !el.disabled);
    controls.forEach(el => { if (el.matches('input,select,textarea')) fieldError(el); el.disabled = true; }); saveState(target, 'Saving…'); message('กำลังบันทึก…', false, target);
    try {
      if (body.profile) validateProfile(body.profile);
      if (body.consent) validateConsent(body.consent);
      if (/\/policies(?:\/|$)/.test(path)) validatePolicy(body.record);
      if (/\/services(?:\/|$)/.test(path)) validateFields(body.record, SERVICE_FIELDS);
      if (path.endsWith('/identity')) validateIdentity({ type: body.type, number: body.number, expiresAt: body.expiresAt });
      const result = await api(path, { method, body, headers: { 'Idempotency-Key': requestKey } });
      requestKey = null; requestSignature = null; s.dirty = false; dialogDirty = false;
      saveState(target, 'Saved');
      return result;
    } catch (error) {
      if (error.fieldErrors) error.payload = { code: error.code, fieldErrors: error.fieldErrors };
      if (target.dataset.customerStep === '2' && Object.keys(error.payload?.fieldErrors || {}).length) setCreationStep(target, 1);
      const code = error.payload?.code;
      s.lastError = code;
      const text = Object.values(error.payload?.fieldErrors || {}).join(' · ') || ({ consent_required: 'ยังไม่มี Consent ที่ครอบคลุมข้อมูลส่วนนี้ บันทึกหลักฐานในแท็บ Consent ก่อน', vault_unavailable: 'ยังไม่ได้ตั้งค่าพื้นที่เก็บข้อมูลส่วนตัว กรุณาติดต่อผู้ดูแลระบบ', document_storage_unavailable: 'พื้นที่เก็บเอกสารส่วนตัวยังไม่พร้อม ไฟล์ยังไม่ได้บันทึก กรุณาติดต่อผู้ดูแลระบบ', already_linked: 'Case นี้เชื่อมกับลูกค้ารายอื่นแล้ว', too_large: 'ไฟล์ต้องมีขนาดไม่เกิน 2 MB', duplicate_customer: 'มีข้อมูลติดต่อซ้ำกับลูกค้าเดิม กรุณาตรวจสอบก่อนเพิ่ม' }[code]) || error.message;
      message(text, true, target); saveState(target, 'Save failed');
      if (error.status === 409 && code === 'version_conflict') {
        const box = target.querySelector('[data-customer-feedback]');
        box.insertAdjacentHTML('beforeend', button('reload-conflict','โหลดข้อมูลล่าสุด','refresh'));
        box.querySelector('button').onclick = async () => { if (await guard()) { closeDialog(); await loadRecord(s.record.id); } };
      }
      let firstInvalid;
      for (const [key, text] of Object.entries(error.payload?.fieldErrors || {})) {
        const input = [...target.querySelectorAll('input,select,textarea')].find(el => el.name === key || el.name.endsWith('.' + key));
        fieldError(input, text); firstInvalid ||= input;
      }
      if (firstInvalid && target.hasAttribute('data-customer-step')) focusCustomerField(target, firstInvalid.name);
      else if (firstInvalid) queueMicrotask(() => firstInvalid.focus());
      else target.querySelector('[data-customer-feedback]')?.scrollIntoView({ block: 'nearest' });
      return null;
    } finally { s.busy = false; target.removeAttribute('aria-busy'); controls.forEach(el => { el.disabled = false; }); }
  }
  async function loadList() {
    if (searchInput) searchInput.value = s.query;
    const key = `customers?status=${s.status}&search=${encodeURIComponent(s.query)}&offset=${s.offset}`;
    const retained = canReuseList() && listKey === key && Date.now() - listLoadedAt < 60000;
    const generation = ++s.generation; s.loading = !retained; s.refreshing = retained; s.error = ''; s.record = null; s.creating = false; renderList();
    try {
      const result = await api(key);
      if (!s.active || generation !== s.generation) return;
      s.rows = result.items; s.total = result.total; s.nextOffset = result.nextOffset; listKey = key; listLoadedAt = Date.now();
    } catch (e) { if (generation !== s.generation) return; s.error = e.message; listKey = null; s.rows = []; s.total = 0; s.nextOffset = null; }
    if (!s.active || generation !== s.generation) return;
    s.loading = false; s.refreshing = false; renderList();
  }
  function renderList() {
    const focused = root.contains(document.activeElement) ? document.activeElement.closest('[data-customer-action]') : null;
    const focusKey = focused ? [focused.dataset.customerAction, focused.dataset.id || '', focused.dataset.value || ''] : null;
    paint(`<header class="customer-page-head"><div><h1>Customers</h1><p>${s.loading ? 'กำลังโหลดข้อมูล…' : s.error ? 'โหลดรายชื่อไม่ได้' : `${s.total} รายชื่อ`}</p><span class="admin-refresh-status" role="status">${s.refreshing ? 'ข้อมูลล่าสุดที่โหลดไว้ · กำลังอัปเดต…' : ''}</span></div>${button('new','เพิ่มลูกค้า','plus','',true)}</header>
      <div class="customer-list-tools"><div class="customer-scope" role="group" aria-label="สถานะลูกค้า">${[['Active','Active'],['Archived','Archived'],['all','All']].map(([v,t]) => button('status',t,null,`data-value="${v}" aria-pressed="${s.status === v}"`)).join('')}</div><span class="customer-private">${icon('lock')}ข้อมูลส่วนตัว</span>${button('refresh','','refresh','aria-label="โหลดรายชื่อลูกค้าใหม่" title="โหลดข้อมูลใหม่"')}</div>
      <section class="customer-list" aria-label="รายชื่อลูกค้า" aria-busy="${s.loading}">${s.loading ? blank('กำลังโหลดรายชื่อลูกค้า','','users') : s.error ? blank('โหลดรายชื่อไม่ได้',s.error,'file',button('refresh','ลองอีกครั้ง','refresh')) : !s.rows.length ? blank(s.query ? 'ไม่พบลูกค้าที่ตรงกับคำค้น' : 'ยังไม่มีลูกค้าในรายการนี้',s.query ? 'ลองค้นด้วยชื่อ เบอร์โทร อีเมล หรือ LINE' : '', 'users', button('new','เพิ่มลูกค้า','plus','',true)) : `<table class="customer-table"><thead><tr><th>ลูกค้า</th><th>ช่องทางติดต่อ</th><th>Status</th><th>อัปเดตล่าสุด</th><th><span class="case-sr-only">เปิดข้อมูล</span></th></tr></thead><tbody>${s.rows.map(r => `<tr><td><button type="button" class="customer-person" data-customer-action="open" data-id="${r.id}"><span class="customer-avatar">${esc([...r.profile.firstName][0])}</span><span><strong>${esc(fullName(r.profile))}</strong><small>${esc(r.code)}</small></span></button></td><td><span>${esc(r.profile.phone || r.profile.email || r.profile.lineId)}</span>${r.profile.phone && r.profile.email ? `<small>${esc(r.profile.email)}</small>` : ''}</td><td>${badge(r.profile.status)}</td><td>${date(r.updatedAt)}</td><td>${button('open','','next',`data-id="${r.id}" aria-label="เปิดข้อมูล ${esc(fullName(r.profile))}" title="เปิดข้อมูลลูกค้า"`)}</td></tr>`).join('')}</tbody></table>`}</section>
      <footer class="customer-pagination"><span>${s.rows.length && !s.loading && !s.error ? `${s.offset + 1}–${s.offset + s.rows.length} จาก ${s.total} รายชื่อ` : ''}</span><div>${button('previous','ก่อนหน้า',null,s.offset === 0 || s.loading ? 'disabled' : '')}${button('next','ถัดไป',null,s.nextOffset === null || s.loading ? 'disabled' : '')}</div></footer>`);
    root.querySelector('.customer-list').setAttribute('aria-busy', String(Boolean(s.loading || s.refreshing)));
    if (focusKey) [...root.querySelectorAll('[data-customer-action]')].find(el => el.dataset.customerAction === focusKey[0] && (el.dataset.id || '') === focusKey[1] && (el.dataset.value || '') === focusKey[2])?.focus({ preventScroll: true });
  }
  async function loadRecord(id, { created = false } = {}) {
    const generation = ++s.generation; paint(blank('กำลังโหลดข้อมูลลูกค้า…','','user'));
    try { const result = await api('customers/' + encodeURIComponent(id)); if (!s.active || generation !== s.generation) return; s.record = result; s.creating = false; s.dirty = false; created ? renderCreated() : renderRecord(); }
    catch (e) {
      if (!s.active || generation !== s.generation) return;
      paint(blank(created ? 'สร้างลูกค้าแล้ว แต่โหลดรายละเอียดไม่ได้' : 'เปิดข้อมูลลูกค้าไม่ได้', created ? 'ข้อมูลถูกบันทึกแล้ว กรุณาโหลดรายละเอียดอีกครั้ง ไม่ต้องสร้างลูกค้าใหม่' : e.message, 'file', `<div class="customer-recovery-actions">${button(created ? 'retry-created' : 'open','โหลดรายละเอียดอีกครั้ง','refresh',`data-id="${esc(id)}"`)}${button('back','กลับไป Customers','back')}</div>`));
      const title = root.querySelector('h2'); title.tabIndex = -1; title.focus();
    }
  }
  function header({ creationStep = s.creating ? 1 : null } = {}) {
    const r = s.record, creating = Boolean(creationStep);
    return `<div class="customer-breadcrumb">${button('back','Customers','back')}<span>/ ${creating ? 'New Customer' : esc(r.code)}</span></div><header class="customer-page-head customer-record-head"><div class="customer-heading"><span class="customer-avatar large">${creating ? icon('user') : esc([...r.profile.firstName][0])}</span><div><h1>${creating ? 'New Customer' : esc(fullName(r.profile))}</h1>${creating ? creationStep === 3 ? '' : '<p data-creation-description>สร้างข้อมูลลูกค้าใหม่</p>' : `<p>${esc(r.profile.phone || r.profile.email || r.profile.lineId)} <span class="customer-divider">/</span> ${esc(r.profile.language || 'TH')}</p>`}</div>${creating ? '' : badge(r.profile.status)}</div>${!creating ? button('new-case','สร้างงานติดต่อ','plus') : `<div data-customer-steps>${customerSteps(creationStep)}</div>`}</header>`;
  }
  function renderCreated() {
    const r = s.record, p = r.profile;
    const savedAt = new Intl.DateTimeFormat('th-TH-u-ca-gregory', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(r.createdAt));
    const actor = r.activities.find(a => a.action === 'customer_created');
    const recorder = actor?.actorId === session.uid ? session.name || 'บัญชีนี้' : '';
    const row = (key, label, value) => `<div data-saved-field="${key}"><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
    const granted = Object.entries(SCOPES).filter(([key]) => hasConsent(r.consents, key));
    paint(`<div class="customer-new customer-success">${header({ creationStep: 3 })}
      <section class="customer-success-intro" aria-labelledby="customer-success-title"><div class="customer-success-mark" aria-hidden="true"><span>${icon('check')}</span>${Array.from({ length: 8 }, () => '<i></i>').join('')}</div><h2 id="customer-success-title" tabindex="-1">สร้างข้อมูลลูกค้าสำเร็จ</h2><p>บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว</p></section>
      <section class="customer-success-summary" aria-labelledby="customer-saved-title"><header><h3 id="customer-saved-title">${sectionTitle('ข้อมูลลูกค้าที่บันทึก', 'user')}</h3>${badge(p.status)}</header><div class="customer-success-data"><dl>
        ${row('code', 'รหัสลูกค้า', `<span class="customer-saved-code" data-customer-code>${esc(r.code)}</span>${button('copy-code', '', 'copy', 'aria-label="คัดลอกรหัสลูกค้า" title="คัดลอกรหัสลูกค้า"')}`)}
        ${row('name', 'ชื่อ–นามสกุล', reviewValue(fullName(p)))}${['phone', 'email', 'lineId'].map(key => row(key, PROFILE_FIELDS.find(f => f.key === key).label, reviewValue(p[key]))).join('')}
      </dl><div class="customer-saved-meta"><dl>${row('createdAt', 'วันที่สร้าง', esc(savedAt))}</dl><button type="button" class="customer-saved-toggle" aria-expanded="false" aria-controls="customer-saved-more">รายละเอียดเพิ่มเติม${icon('down')}</button><dl id="customer-saved-more">${row('language', 'ภาษาที่สะดวก', reviewValue(customerLanguages[p.language] || p.language))}${row('source', 'ช่องทางที่รู้จัก', reviewValue(p.source))}${recorder ? row('recorder', 'ผู้บันทึก', esc(recorder)) : ''}</dl></div></div><p class="customer-copy-feedback" data-copy-feedback role="status" aria-live="polite"></p></section>
      <section class="customer-success-consent" aria-labelledby="customer-saved-consent-title"><div><h3 id="customer-saved-consent-title">${sectionTitle('บันทึกหลักฐาน Consent แล้ว', 'policy')}</h3><ul>${granted.map(([key, label]) => `<li data-saved-scope="${key}">${icon('check')}<span>${esc(label)}</span></li>`).join('')}</ul><p>${r.documents.length ? `เอกสารแนบ ${r.documents.length} รายการ` : 'ยังไม่มีเอกสารแนบ'}</p></div><div class="customer-consent-mark" aria-hidden="true">${icon('file')}<span>${icon('check')}</span></div></section>
      <section class="customer-success-next" aria-labelledby="customer-next-title"><h3 id="customer-next-title">${sectionTitle('ดำเนินการต่อ', 'send')}</h3><div>${button('open', 'ดูข้อมูลลูกค้า', 'eye', `data-id="${esc(r.id)}"`, true)}${button('new', 'สร้างใหม่อีกคน', 'newCustomer')}${button('back', 'ไปที่รายชื่อลูกค้า', 'list')}</div></section>
    </div>`);
    const more = root.querySelector('.customer-saved-toggle');
    more.addEventListener('click', () => more.setAttribute('aria-expanded', String(more.getAttribute('aria-expanded') !== 'true')));
    root.querySelector('#customer-success-title').focus({ preventScroll: true });
    root.querySelector('.customer-breadcrumb').scrollIntoView({ block: 'start' });
  }
  function renderRecord() {
    const r = s.record;
    paint(`${header()}<nav class="customer-tabs" aria-label="ข้อมูลลูกค้า">${tabs.map(([id,text,symbol]) => button('tab',text,symbol,`data-tab="${id}" ${s.tab === id ? 'aria-current="page"' : ''}`)).join('')}</nav>${feedback}<div class="customer-content">${s.tab === 'profile' ? profileForm(r.profile) : s.tab === 'policies' ? policiesView() : s.tab === 'documents' ? documentsView() : s.tab === 'consent' ? consentsView() : historyView()}</div>`);
    bindProfile();
  }
  function profileForm(values, creating = false) {
    return `<form id="customer-profile-form" autocomplete="off" ${creating ? 'novalidate data-customer-step="1"' : ''}>${creating ? `<div data-customer-entry><div class="customer-validation-summary" data-validation-summary role="alert" tabindex="-1" hidden></div>${newCustomerSections(values)}</div><section class="customer-review" data-customer-review aria-labelledby="customer-review-title" hidden></section>${feedback}` : groups(PROFILE_FIELDS, profileGroups, values) + feedback}<footer class="customer-savebar"><span class="customer-save-state" data-customer-dirty aria-live="polite">${creating ? 'ยังไม่ได้บันทึก' : 'Saved'}</span><div>${button(creating ? 'back' : 'reset-profile','ยกเลิก',null, creating ? 'data-create-back' : '')}<button class="article-button article-create" type="submit">${icon(creating ? 'next' : 'save')}${creating ? 'ตรวจสอบข้อมูล' : 'บันทึกข้อมูลลูกค้า'}</button></div></footer></form>${!creating ? identityView() : ''}`;
  }
  function setCreationStep(form, step, sectionIndex) {
    form.dataset.customerStep = String(step);
    form.querySelector('[data-customer-entry]').hidden = step === 2;
    form.querySelector('[data-customer-review]').hidden = step !== 2;
    root.querySelector('[data-customer-steps]').innerHTML = customerSteps(step);
    root.querySelector('[data-creation-description]').textContent = step === 2 ? 'ตรวจสอบข้อมูลก่อนบันทึกในระบบ' : 'สร้างข้อมูลลูกค้าใหม่';
    const back = form.querySelector('[data-create-back]');
    back.innerHTML = step === 2 ? `${icon('back')}<span>กลับไปแก้ไข</span>` : '<span>ยกเลิก</span>';
    step === 2 ? back.removeAttribute('data-customer-action') : back.setAttribute('data-customer-action', 'back');
    const submit = form.querySelector('[type=submit]');
    submit.innerHTML = `${icon(step === 2 ? 'save' : 'next')}${step === 2 ? 'สร้างทะเบียนลูกค้า' : 'ตรวจสอบข้อมูล'}`;
    saveState(form, 'ยังไม่ได้บันทึก');
    message('', false, form);
    if (step === 2) {
      const title = form.querySelector('#customer-review-title');
      title.focus({ preventScroll: true }); root.querySelector('.customer-record-head').scrollIntoView({ block: 'start' });
    } else if (sectionIndex) {
      const name = sectionIndex === 6 ? 'consent.status' : profileGroups[sectionIndex - 1][1][0];
      focusCustomerField(form, name);
    } else {
      root.querySelector('h1').scrollIntoView({ block: 'center' });
      const summary = form.querySelector('[data-customer-section] summary');
      summary.focus({ preventScroll: true });
    }
  }
  function newCustomerErrors(form) {
    const errors = {}, profile = readFields(form, PROFILE_FIELDS), consent = consentInput(form);
    const capture = (check, prefix = '') => {
      try { check(); } catch (error) {
        if (!error.fieldErrors) throw error;
        for (const [name, text] of Object.entries(error.fieldErrors)) errors[prefix + name] = text;
      }
    };
    for (const f of PROFILE_FIELDS) capture(() => validateFields({ [f.key]: profile[f.key] }, [f]));
    for (const f of CONSENT_FIELDS) capture(() => validateFields({ [f.key]: consent[f.key] }, [f]), 'consent.');
    for (const [name, text] of Object.entries(profileRelationErrors(profile))) errors[name] ||= text;
    for (const [name, text] of Object.entries(consentRelationErrors(consent))) errors['consent.' + name] ||= text;
    if (consent.status !== 'Granted') errors['consent.status'] = 'ต้องได้รับความยินยอม (Granted) ก่อนสร้างทะเบียนลูกค้า';
    if (!consent.scopes.includes('profile')) errors['consent.scopes'] = 'ต้องมี Consent สำหรับข้อมูลลูกค้าและการติดต่อก่อนสร้างทะเบียน';
    // Incomplete native dates can expose an empty value even when segments were entered.
    for (const input of form.querySelectorAll('input[type=date]')) if (input.validity.badInput) errors[input.name] = 'กรุณาระบุวันที่ให้ครบถ้วน';
    return errors;
  }
  function newCustomerInput(form, name) {
    return name === 'consent.scopes' ? form.querySelector('[name=scopes][value=profile]') : form.elements.namedItem(name);
  }
  function focusCustomerField(form, name) {
    const input = newCustomerInput(form, name);
    if (!input) return;
    const section = input.closest('details'); if (section) section.open = true;
    requestAnimationFrame(() => {
      const control = input.closest('.cm-select-shell')?.querySelector('.cm-select-trigger') || input;
      control.focus({ preventScroll: true }); control.scrollIntoView({ block: 'center' });
    });
  }
  function showNewCustomerErrors(form, errors) {
    const summary = form.querySelector('[data-validation-summary]');
    const entries = Object.entries(errors);
    summary.hidden = !entries.length;
    summary.innerHTML = entries.length ? `<strong>ตรวจสอบข้อมูลอีก ${entries.length} รายการก่อนสร้างทะเบียน</strong><ul>${entries.map(([name, text]) => `<li><button type="button" data-error-field="${esc(name)}">${esc(text)}${icon('next')}</button></li>`).join('')}</ul>` : '';
    for (const input of form.querySelectorAll('.customer-field input,.customer-field select,.customer-field textarea')) fieldError(input, errors[input.name]);
    const scopes = form.querySelector('[data-scope-error]');
    scopes.hidden = !errors['consent.scopes']; scopes.textContent = errors['consent.scopes'] || '';
    const scopeInput = newCustomerInput(form, 'consent.scopes');
    if (!scopes.hidden) { scopeInput.closest('details').open = true; scopeInput.setAttribute('aria-invalid', 'true'); }
    else scopeInput.removeAttribute('aria-invalid');
  }
  function bindNewCustomer(form) {
    let submitted = false;
    newCustomerInput(form, 'consent.scopes').setAttribute('aria-describedby', 'customer-scopes-error');
    const update = () => {
      const errors = newCustomerErrors(form);
      for (const section of form.querySelectorAll('[data-customer-section]')) {
        const index = Number(section.dataset.customerSection), label = section.querySelector('[data-section-progress]');
        const names = index === 6 ? [...CONSENT_FIELDS.map(f => 'consent.' + f.key), 'consent.scopes'] : profileGroups[index - 1][1];
        const hasValue = names.some(name => name !== 'consent.scopes' && newCustomerInput(form, name)?.value.trim());
        const valid = !names.some(name => errors[name]);
        const optional = index === 3 || index === 4;
        const complete = valid && hasValue && index !== 5;
        label.hidden = !complete && !optional && index !== 5;
        label.dataset.complete = String(complete);
        const retention = form.elements.retentionReviewAt.value;
        label.innerHTML = complete ? `${icon('check')}${optional ? 'มีข้อมูลแล้ว' : 'ข้อมูลครบ'}` : optional ? 'ไม่บังคับ' : esc((form.elements.status.value || 'ยังไม่เลือก Status') + (retention && !errors.retentionReviewAt ? ` · ทบทวน ${date(retention)}` : ''));
      }
      if (submitted) showNewCustomerErrors(form, errors);
      return errors;
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('focusout', event => {
      const input = event.target.matches('.cm-select-trigger') ? event.target.closest('.customer-field')?.querySelector('select') : event.target;
      if (submitted || !input?.matches('.customer-field input,.customer-field textarea,.customer-field select')) return;
      fieldError(input, newCustomerErrors(form)[input.name]);
    });
    form.addEventListener('click', event => {
      const target = event.target.closest('[data-error-field]');
      if (target) focusCustomerField(form, target.dataset.errorField);
    });
    update();
    return () => {
      submitted = true;
      const errors = update();
      if (!Object.keys(errors).length) return true;
      saveState(form, 'Check required fields');
      form.querySelector('[data-validation-summary]').focus();
      return false;
    };
  }
  function bindProfile() {
    const form = root.querySelector('#customer-profile-form'); if (!form) return;
    bindFormState(form, () => { s.dirty = true; });
    const validateNew = s.creating ? bindNewCustomer(form) : null;
    let reviewedBody = null;
    if (validateNew) form.addEventListener('click', event => {
      if (s.busy) return;
      if (event.detail > 1 && event.target.closest('[type=submit]')) { event.preventDefault(); return; }
      const edit = event.target.closest('[data-review-edit]');
      if (edit || (event.target.closest('[data-create-back]') && form.dataset.customerStep === '2')) {
        reviewedBody = null;
        setCreationStep(form, 1, edit ? Number(edit.dataset.reviewEdit) : null);
        // The footer is handled here rather than by the list-navigation handler.
        event.stopPropagation();
      }
      const toggle = event.target.closest('[data-review-toggle]');
      if (toggle) {
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        form.querySelector(`#${toggle.getAttribute('aria-controls')}`).hidden = !expanded;
      }
    });
    if (validateNew) form.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.repeat && form.dataset.customerStep === '2') event.preventDefault();
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (s.busy) return;
      if (validateNew && !validateNew()) {
        if (form.dataset.customerStep === '2') { setCreationStep(form, 1); form.querySelector('[data-validation-summary]').focus(); }
        return;
      }
      const body = { profile: readFields(form,PROFILE_FIELDS) };
      if (s.creating) { body.consent = consentInput(form); if (s.sourceCase) body.sourceCaseId = s.sourceCase; }
      else body.expectedVersion = s.record.version;
      if (validateNew) {
        body.profile = validateProfile(body.profile); body.consent = validateConsent(body.consent);
        if (form.dataset.customerStep !== '2' || JSON.stringify(body) !== JSON.stringify(reviewedBody)) {
          const changed = form.dataset.customerStep === '2';
          reviewedBody = body;
          form.querySelector('[data-customer-review]').innerHTML = customerReview(body);
          setCreationStep(form, 2);
          if (changed) message('ข้อมูลมีการเปลี่ยนแปลง กรุณาตรวจสอบอีกครั้งก่อนยืนยัน', false, form);
          return;
        }
      }
      const creating = s.creating;
      let result = await mutate(creating ? 'customers' : 'customers/' + s.record.id, body, creating ? 'POST' : 'PATCH', form);
      if (!result && s.lastError === 'duplicate_customer' && await confirm('พบข้อมูลติดต่อซ้ำ', 'มีลูกค้ารายอื่นใช้เบอร์โทร อีเมล หรือ LINE นี้แล้ว ยืนยันว่าเป็นคนละคนและต้องการใช้ข้อมูลติดต่อร่วมกันหรือไม่?', 'ยืนยันใช้ข้อมูลติดต่อร่วมกัน')) {
        result = await mutate(s.creating ? 'customers' : 'customers/' + s.record.id, { ...body, allowDuplicate: true }, s.creating ? 'POST' : 'PATCH', form);
      }
      if (result) { route(result.id); await loadRecord(result.id, { created: creating }); if (!creating) message('บันทึกข้อมูลลูกค้าแล้ว'); }
    });
  }
  async function create(sourceCaseId = null) {
    if (!await guard()) return;
    const generation = ++s.generation; s.creating = true; s.record = null; s.sourceCase = sourceCaseId; s.tab = 'profile';
    const profile = emptyFields(PROFILE_FIELDS); profile.language = 'TH';
    if (sourceCaseId) {
      try { const result = await api('cases/' + encodeURIComponent(sourceCaseId)); if (!s.active || generation !== s.generation) return; Object.assign(profile, { firstName: result.record.contact.name, phone: result.record.contact.phone || '', email: result.record.contact.email || '', lineId: result.record.contact.lineId || '' }); }
      catch(e) { if (s.active && generation === s.generation) paint(blank('เปิดงานติดต่อไม่ได้',e.message,'file',button('back','กลับไป Customers','back'))); return; }
    }
    paint(`<div class="customer-new">${header()}${profileForm(profile,true)}</div>`); bindProfile();
  }
  function identityView() {
    const r = s.record, ready = r.vaultAvailable && hasConsent(r.consents,'identity');
    return `<section class="customer-form-section"><div class="customer-section-head"><h3>${icon('lock')} เลขประจำตัว</h3>${button('identity',r.identity ? 'เปลี่ยนข้อมูล' : 'เพิ่มเลขบัตร / Passport','plus',ready ? '' : 'disabled')}</div>${r.identity ? `<div class="customer-identity"><strong>${esc(r.identity.type)} · •••• ${esc(r.identity.suffix)}</strong><span>หมดอายุ ${date(r.identity.expiresAt)}</span>${button('reveal','เปิดดูเลขเต็ม','eye',ready ? '' : 'disabled')}</div>` : '<p class="customer-muted">ยังไม่มีเลขประจำตัว</p>'}${!ready ? `<p class="customer-inline-note">${r.vaultAvailable ? 'ยังไม่มี Consent สำหรับเลขบัตร / Passport' : 'ยังไม่ได้ตั้งค่าพื้นที่เก็บข้อมูลส่วนตัว'}</p>` : ''}</section>`;
  }
  function policiesView() {
    const items = s.record.policies;
    return `<div class="customer-section-head"><h2>Policies <span class="customer-count">${items.length}</span></h2>${button('policy','เพิ่มกรมธรรม์','plus','',true)}</div>${items.length ? `<div class="customer-policy-list">${items.map(p => `<article class="customer-policy"><header><span class="customer-item-icon">${icon('policy')}</span><div><small>${esc(p.insurer)} · ${esc(policyTypeLabels[p.type] || p.type)}</small><h3>${esc(p.plan)}</h3></div>${badge(p.status)}</header><dl><div><dt>เลขกรมธรรม์</dt><dd>${esc(p.policyNumber || 'ยังไม่ระบุ')}</dd></div><div><dt>ผู้เอาประกัน</dt><dd>${esc(p.insured || 'ยังไม่ระบุ')}</dd></div><div><dt>เบี้ยต่องวด</dt><dd>${p.premium ? Number(p.premium).toLocaleString('th-TH') + ' บาท' : 'ยังไม่ระบุ'}</dd></div><div><dt>ชำระครั้งถัดไป</dt><dd>${date(p.nextDueAt)}</dd></div></dl><footer><span>${p.startsAt ? date(p.startsAt) : 'ยังไม่ระบุวันเริ่ม'} – ${p.endsAt ? date(p.endsAt) : 'ยังไม่ระบุวันสิ้นสุด'}</span>${button('policy','รายละเอียด / แก้ไข','next',`data-id="${p.id}"`)}</footer></article>`).join('')}</div>` : blank('ยังไม่มีกรมธรรม์','','policy')}`;
  }
  const policySelect = value => `<div class="customer-field customer-policy-link" data-field-type="select"><label for="customer-policy-link">กรมธรรม์ที่เกี่ยวข้อง</label><select id="customer-policy-link" name="policyId"><option value="">ไม่ผูกกับกรมธรรม์</option>${s.record.policies.map(p => `<option value="${p.id}" ${p.id === value ? 'selected' : ''}>${esc(p.insurer + ' · ' + (p.policyNumber || p.plan))}</option>`).join('')}</select></div>`;
  function documentsView() {
    const r = s.record, ready = r.documentStorageAvailable && hasConsent(r.consents,'documents');
    return `<div class="customer-section-head"><h2>Documents <span class="customer-count">${r.documents.length}</span></h2>${button('upload','เพิ่มเอกสาร','plus',ready ? '' : 'disabled',true)}</div>${!ready ? `<div class="customer-inline-note">${icon('lock')}${r.documentStorageAvailable ? 'ยังไม่มี Consent สำหรับเอกสารส่วนตัว' : 'ยังไม่ได้เปิดใช้พื้นที่เก็บเอกสารส่วนตัว'}</div>` : ''}${r.documents.length ? `<div class="customer-record-list">${r.documents.map(d => `<article><span class="customer-item-icon">${icon('file')}</span><div><h3>${esc(d.name)}</h3><p>${esc(d.category)} · ${Math.ceil(d.size/1024)} KB · ${date(d.createdAt)}</p>${d.notes ? `<p>${esc(d.notes)}</p>` : ''}</div>${button('download','','download',`data-id="${d.id}" aria-label="ดาวน์โหลด ${esc(d.name)}" title="ดาวน์โหลดเอกสาร" ${ready && (d.category !== 'Identity' || hasConsent(r.consents,'identity')) ? '' : 'disabled'}`)}</article>`).join('')}</div>` : blank('ยังไม่มีเอกสาร','PDF, JPG หรือ PNG · ไม่เกิน 2 MB ต่อไฟล์','file')}`;
  }
  function consentsView() {
    return `<div class="customer-section-head"><h2>Consent</h2>${button('consent','บันทึกการยินยอม / ถอน','plus','',true)}</div><div class="customer-consent-status">${Object.entries(SCOPES).map(([key,label]) => `<div>${hasConsent(s.record.consents,key) ? icon('check') : icon('lock')}<span>${label}</span>${badge([...s.record.consents].reverse().find(c => c.scopes.includes(key))?.status || 'Not recorded')}</div>`).join('')}</div><h3 class="customer-history-title">หลักฐานที่บันทึกไว้</h3><div class="customer-record-list">${[...s.record.consents].reverse().map(c => `<article><span class="customer-item-icon">${icon('consent')}</span><div><h3>${c.scopes.map(scope => SCOPES[scope]).join(', ')}</h3><p>${date(c.occurredAt)} · ${esc(c.channel)} · ${esc(c.noticeVersion)}</p><details><summary>ดูหลักฐาน</summary><p class="customer-preserve">${esc(c.noticeText)}</p><p>${esc(c.evidence)}</p><small>บันทึกเข้าระบบ ${date(c.recordedAt)}</small></details></div>${badge(c.status)}</article>`).join('')}</div>`;
  }
  function historyView() {
    return `<div class="customer-section-head"><h2>Service History</h2>${button('service','เพิ่มบันทึกการดูแล','plus','',true)}</div><div class="customer-record-list">${s.record.services.map(v => `<article><span class="customer-item-icon">${icon('history')}</span><div><h3>${esc(v.subject)}</h3><p>${esc(v.type)} · ${date(v.occurredAt)} · ${esc(v.status)}</p><p>${esc(v.notes)}</p></div>${button('service','','next',`data-id="${v.id}" aria-label="แก้ไข ${esc(v.subject)}" title="แก้ไขบันทึกการดูแล"`)}</article>`).join('') || blank('ยังไม่มีบันทึกการดูแล','','history')}</div><div class="customer-section-head"><h3>งานติดต่อที่เชื่อมไว้</h3>${button('link-case','เชื่อมงานติดต่อเดิม','link')}</div><div class="customer-record-list">${s.record.cases.map(c => `<article><span class="customer-item-icon">${icon('phone')}</span><div><h3>${esc(c.subject)}</h3><p>${esc(c.number)} · ${esc(c.status)}</p></div>${button('case','เปิดงาน','next',`data-id="${c.id}"`)}</article>`).join('') || '<p class="customer-muted">ยังไม่มีงานติดต่อที่เชื่อมไว้</p>'}</div><details class="customer-audit"><summary>ประวัติการเปลี่ยนแปลงและการเปิดข้อมูล</summary>${s.record.activities.map(a => `<p>${date(a.createdAt)} · ${esc(({ customer_created:'สร้างทะเบียนลูกค้า', profile_updated:'แก้ไขข้อมูลลูกค้า', policies_created:'เพิ่มกรมธรรม์', policies_updated:'แก้ไขกรมธรรม์', services_created:'เพิ่มบันทึกการดูแล', services_updated:'แก้ไขบันทึกการดูแล', consent_recorded:'บันทึก Consent', identity_updated:'แก้ไขเลขประจำตัว', identity_viewed:'เปิดดูเลขประจำตัว', document_uploaded:'เพิ่มเอกสาร', document_downloaded:'ดาวน์โหลดเอกสาร', case_linked:'เชื่อมงานติดต่อ', case_created:'สร้างงานติดต่อ' })[a.action] || a.action)}</p>`).join('')}</details>`;
  }
  async function saveChild(path, body, form, method = 'POST') {
    const result = await mutate(`customers/${s.record.id}/${path}`, { expectedVersion: s.record.version, ...body },method,form);
    if (result) { closeDialog(); await loadRecord(s.record.id); message('บันทึกแล้ว'); } return result;
  }
  function editPolicy(id) {
    const p = s.record.policies.find(p => p.id === id) || { ...emptyFields(POLICY_FIELDS), policyholder: fullName(s.record.profile), insured: fullName(s.record.profile) };
    openDialog(id ? 'Edit Policy' : 'New Policy', groups(policyEditorFields,policyGroups,p), form => saveChild('policies' + (id ? '/' + id : ''), { record: readFields(form,POLICY_FIELDS) },form,id ? 'PATCH' : 'POST'), 'บันทึกกรมธรรม์', { symbol: 'policy' });
  }
  async function action(e) {
    const b = e.target.closest('[data-customer-action]'); if (!b || !s.active || s.busy || b.disabled) return;
    const a = b.dataset.customerAction, id = b.dataset.id;
    if (a === 'retry-created') return loadRecord(id, { created: true });
    if (a === 'copy-code' && s.record) {
      const note = root.querySelector('[data-copy-feedback]'); b.disabled = true;
      try { await navigator.clipboard.writeText(s.record.code); if (note?.isConnected) note.textContent = 'คัดลอกรหัสลูกค้าแล้ว'; }
      catch { if (note?.isConnected) { note.textContent = 'คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกรหัสลูกค้าแล้วคัดลอก'; const code = root.querySelector('[data-customer-code]'), range = document.createRange(); range.selectNodeContents(code); window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(range); } }
      finally { b.disabled = false; }
      return;
    }
    if (a === 'new') { if (!await guard()) return; route(null); return create(); }
    if (a === 'open') { if (!await guard()) return; s.tab = 'profile'; route(id); return loadRecord(id); }
    if (a === 'back') { if (!await guard()) return; route(null); return loadList(); }
    if (a === 'refresh') return loadList();
    if (a === 'previous' || a === 'next' || a === 'status') { s.offset = a === 'next' ? s.nextOffset : a === 'previous' ? Math.max(0,s.offset-20) : 0; if (a === 'status') s.status = b.dataset.value; return loadList(); }
    if (a === 'reset-profile') { if (await guard()) s.creating ? create(s.sourceCase) : renderRecord(); return; }
    if (a === 'tab') { if (!await guard()) return; s.tab = b.dataset.tab; renderRecord(); root.querySelector(`[data-tab="${s.tab}"]`)?.focus(); return; }
    if (s.dirty && ['identity','reveal','new-case'].includes(a)) { if (!await guard()) return; renderRecord(); }
    if (a === 'policy') return editPolicy(id);
    if (a === 'consent') return openDialog('Record Consent',consentForm(), form => saveChild('consents',{consent:consentInput(form)},form), 'บันทึก Consent', { symbol: 'consent' });
    if (a === 'service') {
      const v = s.record.services.find(v => v.id === id) || emptyFields(SERVICE_FIELDS);
      const details = SERVICE_FIELDS.filter(f => ['type','subject','occurredAt','status','notes'].includes(f.key));
      const followUp = SERVICE_FIELDS.filter(f => ['reference','followUpAt'].includes(f.key));
      return openDialog(id ? 'Edit Service Record' : 'New Service Record', formSection('รายละเอียดการดูแล', fields(details,v), 'history') + formSection('การติดตามและกรมธรรม์', fields(followUp,v) + policySelect(v.policyId), 'calendar'), form => saveChild('services'+(id?'/'+id:''),{record:readFields(form,SERVICE_FIELDS),policyId:form.elements.policyId.value},form,id?'PATCH':'POST'), 'บันทึกการดูแล', { symbol: 'history' });
    }
    if (a === 'identity') return openDialog('Identity Document',fields([{key:'type',label:'ประเภทเอกสาร',type:'select',required:true,options:['National ID','Passport']},{key:'number',label:'เลขบัตร / Passport',type:'text',max:40,required:true},{key:'expiresAt',label:'วันหมดอายุ',type:'date'}]),form=>saveChild('identity',{type:form.elements.type.value,number:form.elements.number.value,expiresAt:form.elements.expiresAt.value},form), 'บันทึกเลขประจำตัว', { symbol: 'lock' });
    if (a === 'reveal') {
      if (!await confirm('เปิดดูเลขประจำตัว', 'ระบบจะบันทึกประวัติการเปิดดูข้อมูลนี้', 'เปิดดู')) return;
      const result = await mutate(`customers/${s.record.id}/identity-reveal`,{expectedVersion:s.record.version});
      if (result) { openDialog(s.record.identity.type,`<p class="customer-revealed">${esc(result.number)}</p>`,()=>closeDialog(),'ปิด', { symbol: 'lock', submitIcon: 'check' }); const el = dialog; setTimeout(()=>{if(dialog===el)closeDialog();},30000); } return;
    }
    if (a === 'upload') return openDialog('Upload Document',`<div class="customer-upload"><label for="customer-file">${icon('file')} ไฟล์เอกสาร</label><input id="customer-file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required><p>PDF, JPG, PNG · ไม่เกิน 2 MB</p></div>${fields([{key:'category',label:'ประเภทเอกสาร',type:'select',required:true,options:['Policy','Consent','Identity','Claim','Other']},{key:'notes',label:'บันทึกเกี่ยวกับเอกสาร',type:'textarea',max:1000}])}${policySelect()}`,async form=>{
      const f=form.elements.file.files[0]; if(!f)return; if(f.size>2*1024*1024)return message('ไฟล์ต้องมีขนาดไม่เกิน 2 MB',true,form);
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(f);});
      await saveChild('documents',{name:f.name,type:f.type,data,category:form.elements.category.value,notes:form.elements.notes.value,policyId:form.elements.policyId.value},form);
    },'อัปโหลดเอกสาร', { symbol: 'file', submitIcon: 'upload' });
    if (a === 'download') {
      if (!await confirm('ดาวน์โหลดเอกสารส่วนตัว','ไฟล์จะถูกบันทึกลงอุปกรณ์นี้ และระบบจะบันทึกประวัติการดาวน์โหลด','ดาวน์โหลด')) return;
      const result=await mutate(`customers/${s.record.id}/document-download/${id}`,{expectedVersion:s.record.version});
      if(result){const bytes=Uint8Array.from(atob(result.data),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:result.type})),link=document.createElement('a');link.href=url;link.download=result.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('ดาวน์โหลดเอกสารแล้ว');} return;
    }
    if (a === 'case') { if(await guard()) await openCase(id); return; }
    if (a === 'new-case') return openDialog('New Case',fields([{key:'subject',label:'เรื่องที่ต้องติดตาม',type:'text',max:300,required:true}]),async form=>{
      const p=s.record.profile,result=await saveChild('cases',{record:{contact:{name:fullName(p),phone:p.phone||null,email:p.email||null,lineId:p.lineId||null,rawContact:null},interestType:'unsure',enquiryTopic:form.elements.subject.value}},form);
      if(result)await openCase(result.targetId);
    },'สร้างงานติดต่อ', { symbol: 'phone' });
    if(a==='link-case') {
      openDialog('Link Existing Case','<label class="customer-link-search">ค้นหาชื่อ เลขเคส หรือเบอร์โทร<input name="caseSearch" type="search"></label><div data-case-matches></div><input name="caseId" type="hidden">',form=>{if(!form.elements.caseId.value)return message('เลือกงานติดต่อก่อน',true,form);return saveChild('case-link',{caseId:form.elements.caseId.value},form);},'เชื่อมงานติดต่อ', { symbol: 'link' });
      const el=dialog;let sequence=0,timer;
      const search=async()=>{const generation=++sequence;try{const data=await api('cases?scope=all&search='+encodeURIComponent(el.querySelector('[name=caseSearch]').value));if(dialog!==el||generation!==sequence)return;el.querySelector('[data-case-matches]').innerHTML=data.items.map(c=>`<label class="customer-case-choice"><input type="radio" name="caseChoice" value="${c.id}"><span><strong>${esc(c.contact.name)}</strong><small>${esc(c.caseNumber)} · ${esc(c.enquiryTopic)}</small></span></label>`).join('')||'<p>ไม่พบงานติดต่อ</p>';}catch(e){message(e.message,true,el);}};
      el.querySelector('[name=caseSearch]').oninput=()=>{clearTimeout(timer);timer=setTimeout(search,250);};el.addEventListener('change',e=>{if(e.target.name==='caseChoice')el.querySelector('[name=caseId]').value=e.target.value;});search();
    }
  }
  root.addEventListener('click', action);
  window.addEventListener('beforeunload',e=>{if(s.active&&(s.dirty||dialogDirty||s.busy)){e.preventDefault();e.returnValue='';}});
  return {
    get active(){return s.active;}, canLeave:guard, invalidateList,
    async mount(){if(s.active)return;s.active=true;if(!permitted){paint(blank('ไม่มีสิทธิ์เข้าถึงทะเบียนลูกค้า','บัญชีนี้ไม่ใช่เจ้าของระบบ','lock'));return;}await this.syncLocation();},
    async syncLocation(){if(!await guard()){const url=new URL(location.href);s.record?url.searchParams.set('customer',s.record.id):url.searchParams.delete('customer');url.hash='customers';history.replaceState(null,'',url);return;}const params=new URL(location.href).searchParams;if(params.get('fromCase'))await create(params.get('fromCase'));else if(currentId())await loadRecord(currentId());else await loadList();},
    async leave(){if(!await guard())return false;s.active=false;s.generation++;s.record=null;closeDialog();clearTimeout(searchTimer);root.classList.remove('customers-screen');return true;},
    setSearch(value){if(!s.active)return;clearTimeout(searchTimer);searchTimer=setTimeout(async()=>{if(!s.active)return;if(!await guard()){if(searchInput)searchInput.value=s.query;return;}s.query=value.trim();s.offset=0;route(null);await loadList();},250);}
  };
}
