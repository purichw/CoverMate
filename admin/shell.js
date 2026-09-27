// All Admin entry points share this navigation; modules own only their workspace.
export const ADMIN_MODULES = [
  { id: 'home', label: 'หน้าแรก', icon: 'home' },
  { id: 'operations', label: 'งานลูกค้า', icon: 'users' },
  { id: 'content', label: 'จัดการเว็บไซต์', icon: 'edit' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'settings', label: 'ตั้งค่า', icon: 'settings' }
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
