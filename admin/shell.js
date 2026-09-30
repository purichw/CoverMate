// All Admin entry points share this navigation; modules own only their workspace.
export const ADMIN_MODULES = [
  { id: 'home', label: 'หน้าแรก', icon: 'home' },
  { id: 'operations', label: 'งานลูกค้า', icon: 'users' },
  { id: 'content', label: 'จัดการเว็บไซต์', icon: 'edit' },
  { id: 'articles', label: 'บทความ', icon: 'file' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' }
];

export function adminNavigation(current, icon, { mobile = false } = {}) {
  return ADMIN_MODULES.map(item => `
    <button class="nav-button ${item.id === current ? 'active' : ''}" type="button"
      ${mobile ? 'data-case-action="navigate"' : 'data-action="module"'} data-module="${item.id}"
      ${item.id === current ? 'aria-current="page"' : ''}>
      <span class="nav-icon" aria-hidden="true">${icon(item.icon)}</span>
      <span>${item.label}</span>
    </button>
  `).join('');
}

const accountEscape = value => String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export function accountIdentity(session, role, icon, ids = false) {
  const name = session.name || session.email || 'ผู้ดูแล CoverMate';
  const initials = name.split(/\s+/).filter(Boolean).map(part => [...part][0]).join('').slice(0,2).toUpperCase() || 'CM';
  const online = globalThis.navigator?.onLine !== false;
  return `<span class="admin-account-identity" data-account-online="${online}">
    <span class="admin-account-avatar" ${ids?'id="userAvatar"':''}>${accountEscape(initials)}<i aria-hidden="true"></i></span>
    <span class="admin-account-copy"><strong ${ids?'id="userName"':''}>${accountEscape(name)}</strong>
      <span class="admin-account-role">${icon('shield')}<span ${ids?'id="userMeta"':''}>${accountEscape(role)}</span></span>
      <span class="admin-account-status" title="การเชื่อมต่ออินเทอร์เน็ตของอุปกรณ์"><i aria-hidden="true"></i><span data-account-network>${online?'ออนไลน์':'ออฟไลน์'}</span></span>
    </span></span>`;
}

export function adminAccountMenu(session, role, icon, { mobile = false } = {}) {
  return `<details class="admin-account ${mobile?'admin-account-mobile':''}">
    <summary aria-label="เมนูบัญชี ${accountEscape(session.name || session.email)}">${accountIdentity(session,role,icon,!mobile)}<span class="admin-account-chevron" aria-hidden="true">${icon('chevronDown')}</span></summary>
    <div class="admin-account-menu">
      <div class="admin-account-mobile-heading">${accountIdentity(session,role,icon)}<button type="button" data-account-dismiss aria-label="ปิดเมนูบัญชี">${icon('close')}</button></div>
      <nav aria-label="จัดการบัญชี">
        <button type="button" data-admin-account-action="details">${icon('user')}<span>ข้อมูลบัญชี</span></button>
        <button type="button" data-admin-account-action="preferences">${icon('settings')}<span>ตั้งค่าการแจ้งเตือน</span></button>
        <button type="button" data-admin-account-action="notifications">${icon('bell')}<span>การแจ้งเตือน</span></button>
      </nav>
      <div class="admin-account-signout"><button class="logout" type="button" data-action="logout">${icon('logout')}<span>ออกจากระบบ</span></button></div>
    </div>
  </details>`;
}

export function adminAccountDetails(session, role, icon) {
  return `<div class="admin-account-details">${accountIdentity(session,role,icon)}
    <dl><dt>ชื่อผู้ใช้</dt><dd>${accountEscape(session.name || '—')}</dd><dt>อีเมล</dt><dd>${accountEscape(session.email || '—')}</dd><dt>บทบาท</dt><dd>${accountEscape(role)}</dd><dt>สถานะบัญชี</dt><dd>ยืนยันสิทธิ์แล้ว</dd></dl>
    <div class="admin-account-signout"><button class="logout" type="button" data-action="logout">${icon('logout')}<span>ออกจากระบบ</span></button></div></div>`;
}

export function bindAdminAccounts(actions) {
  const close = (account, restoreFocus = false) => {
    account.open = false;
    if (restoreFocus) account.querySelector('summary')?.focus();
  };
  document.addEventListener('click', event => {
    const account = event.target.closest('.admin-account');
    if (!account) return;
    if (event.target.closest('[data-account-dismiss]')) return close(account,true);
    const action = event.target.closest('[data-admin-account-action]');
    if (action) {close(account,true);actions[action.dataset.adminAccountAction]?.();}
  });
  document.addEventListener('pointerdown', event => {
    document.querySelectorAll('.admin-account[open]').forEach(account => {if(!account.contains(event.target))close(account);});
  });
  document.addEventListener('keydown', event => {
    if(event.key !== 'Escape')return;
    const account=document.querySelector('.admin-account[open]');
    if(account){event.preventDefault();event.stopImmediatePropagation();close(account,true);}
  },true);
  const syncConnection = () => {
    const online = navigator.onLine;
    document.querySelectorAll('[data-account-online]').forEach(node => node.dataset.accountOnline=String(online));
    document.querySelectorAll('[data-account-network]').forEach(node => node.textContent=online?'ออนไลน์':'ออฟไลน์');
  };
  window.addEventListener('online',syncConnection);
  window.addEventListener('offline',syncConnection);
}
