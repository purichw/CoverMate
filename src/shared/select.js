// Native selects remain the form/state owners. The custom surface only dispatches
// their existing events; React-owned selects must already have a cm-select-shell.
const controls = new Map();
let openControl, popup, active = -1, serial = 0, search = '', searchedAt = 0;
const eligible = select => !select.multiple && select.size <= 1;
const enabled = option => !!option && !option.disabled && !option.closest('optgroup[disabled]');

function close() {
  if (!openControl) return;
  openControl.button.setAttribute('aria-expanded', 'false');
  openControl.button.removeAttribute('aria-activedescendant');
  popup?.remove();
  popup = null;
  openControl = null;
  search = '';
}

function position() {
  if (!openControl) return;
  const { button, select } = openControl;
  const rect = button.getBoundingClientRect();
  const viewport = window.visualViewport;
  const top = viewport?.offsetTop || 0, left = viewport?.offsetLeft || 0;
  const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
  if (!select.isConnected || select.disabled || !button.getClientRects().length || rect.bottom < top || rect.top > top + height) return close();
  const below = top + height - rect.bottom - 12, above = rect.top - top - 12;
  const upward = below < Math.min(popup.scrollHeight, 300) && above > below;
  popup.style.width = Math.min(rect.width, width - 24) + 'px';
  popup.style.maxHeight = Math.max(44, Math.min(360, upward ? above : below)) + 'px';
  popup.style.left = Math.max(left + 12, Math.min(rect.left, left + width - popup.offsetWidth - 12)) + 'px';
  popup.style.top = (upward ? rect.top - popup.offsetHeight - 6 : rect.bottom + 6) + 'px';
}

function highlight(index, scroll = true) {
  if (!openControl) return;
  const options = [...openControl.select.options];
  if (!options[index] || !enabled(options[index])) return;
  active = index;
  for (const node of popup.querySelectorAll('[role=option]')) node.classList.toggle('is-active', Number(node.dataset.index) === index);
  const node = popup.querySelector(`[data-index="${index}"]`);
  openControl.button.setAttribute('aria-activedescendant', node.id);
  if (scroll) node.scrollIntoView({ block:'nearest' });
}

function choose(index) {
  const control = openControl;
  if (!control || !enabled(control.select.options[index])) return;
  const identity = [...control.select.attributes]
    .filter(attribute => attribute.name === 'id' || attribute.name === 'name' || attribute.name.startsWith('data-') && attribute.name !== 'data-dc-tpl')
    .map(attribute => `select[${CSS.escape(attribute.name)}="${CSS.escape(attribute.value)}"]`);
  close();
  // Use the native setter so React's event tracking and vanilla listeners agree.
  const changed = control.select.selectedIndex !== index;
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex').set.call(control.select, index);
  if (changed) {
    control.select.dispatchEvent(new Event('input', { bubbles:true }));
    control.select.dispatchEvent(new Event('change', { bubbles:true }));
  }
  refresh();
  if (control.button.isConnected) control.button.focus({ preventScroll:true });
  else requestAnimationFrame(() => {
    // Vanilla filter screens may replace the whole form in their change handler.
    // Restore only an unambiguous replacement, and never steal intentional focus.
    if (document.activeElement !== document.body) return;
    refresh();
    const replacement = identity.map(selector => [...document.querySelectorAll(selector)]).find(nodes => nodes.length === 1)?.[0];
    controls.get(replacement)?.button.focus({ preventScroll:true });
  });
}

function open(control) {
  if (control.select.disabled || !control.select.options.length) return;
  close();
  openControl = control;
  control.button.focus({ preventScroll:true });
  popup = document.createElement('div');
  popup.className = 'cm-select-menu';
  popup.id = control.menuId;
  popup.setAttribute('role', 'listbox');
  popup.setAttribute('aria-label', control.button.getAttribute('aria-label') || 'Options');
  popup.setAttribute('popover', 'manual');
  popup.style.fontFamily = getComputedStyle(control.select).fontFamily;
  let group;
  [...control.select.options].forEach((option, index) => {
    if (option.parentElement.tagName === 'OPTGROUP' && group !== option.parentElement) {
      group = option.parentElement;
      const heading = document.createElement('div');
      heading.className = 'cm-select-group';
      heading.textContent = group.label;
      popup.append(heading);
    }
    const row = document.createElement('div');
    row.id = `${control.menuId}-${index}`;
    row.dataset.index = index;
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(option.selected));
    row.setAttribute('aria-disabled', String(!enabled(option)));
    row.textContent = option.label;
    popup.append(row);
  });
  // Stay inside a modal's DOM for its inert/focus boundary, but use the top layer
  // so clipping and stacking contexts cannot crop the menu.
  (control.select.closest('dialog,[aria-modal=true]') || document.body).append(popup);
  popup.showPopover?.();
  popup.addEventListener('pointerdown', event => event.preventDefault());
  popup.addEventListener('click', event => {
    const row = event.target.closest('[role=option]');
    if (row && row.getAttribute('aria-disabled') !== 'true') choose(Number(row.dataset.index));
  });
  popup.addEventListener('pointermove', event => {
    const row = event.target.closest('[role=option]');
    if (row) highlight(Number(row.dataset.index), false);
  });
  control.button.setAttribute('aria-expanded', 'true');
  active = -1;
  position();
  if (openControl) highlight(enabled(control.select.options[control.select.selectedIndex]) ? control.select.selectedIndex : [...control.select.options].findIndex(enabled));
}

function keydown(event, control) {
  if (control.select.disabled) return;
  const key = event.key, isOpen = openControl === control;
  if (key === 'Tab') { close(); return; }
  if (key === 'Escape') {
    if (isOpen) { event.preventDefault(); event.stopPropagation(); close(); }
    return;
  }
  if (key === 'Enter' || (key === ' ' && !search)) {
    event.preventDefault();
    if (isOpen && active >= 0) choose(active); else open(control);
    return;
  }
  if (['ArrowDown','ArrowUp','Home','End'].includes(key)) {
    event.preventDefault();
    if (!isOpen) { open(control); if (key.startsWith('Arrow')) return; }
    const indexes = [...control.select.options].flatMap((option, index) => enabled(option) ? [index] : []);
    const at = indexes.indexOf(active);
    highlight(key === 'Home' ? indexes[0] : key === 'End' ? indexes.at(-1) : indexes[Math.max(0, Math.min(indexes.length - 1, at + (key === 'ArrowDown' ? 1 : -1)))]);
    return;
  }
  if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    if (!isOpen) open(control);
    const now = Date.now();
    search = now - searchedAt > 700 ? key : search + key;
    searchedAt = now;
    const repeated = [...search].every(letter => letter === key);
    const needle = (repeated ? key : search).toLocaleLowerCase();
    const options = [...control.select.options];
    for (let step = 1; step <= options.length; step++) {
      const index = ((repeated ? active : -1) + step) % options.length;
      if (enabled(options[index]) && options[index].label.trim().toLocaleLowerCase().startsWith(needle)) { highlight(index); break; }
    }
  }
}

function sync(control) {
  const { select, button, text, shell } = control;
  const value = select.selectedOptions[0]?.label || '';
  const optionsKey = [...select.options].map(option => [option.value,option.label,option.disabled,option.selected].join('\t')).join('\n');
  if (openControl === control && optionsKey !== control.optionsKey) close();
  control.optionsKey = optionsKey;
  if (text.textContent !== value) text.textContent = value;
  button.title = value;
  button.disabled = select.matches(':disabled');
  const labelledBy = select.getAttribute('aria-labelledby');
  const label = select.getAttribute('aria-label') || [...select.labels || []].map(node => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('.cm-select-shell,select,button,input,textarea').forEach(node => node.remove());
    return copy.textContent.trim();
  }).join(' ');
  const attrs = {
    'aria-label': labelledBy ? null : label || value,
    'aria-labelledby': labelledBy,
    'aria-describedby':select.getAttribute('aria-describedby'),
    'aria-required':select.required ? 'true' : select.getAttribute('aria-required'),
    'aria-invalid':select.getAttribute('aria-invalid')
  };
  for (const [name, value] of Object.entries(attrs)) {
    if (value == null) { if (button.hasAttribute(name)) button.removeAttribute(name); }
    else if (button.getAttribute(name) !== value) button.setAttribute(name, value);
  }
  // Preserve each existing control's geometry/theme, including compact Admin and
  // calculator controls. Only the menu and interaction states are standardized.
  const style = getComputedStyle(select);
  shell.hidden = select.hidden || style.display === 'none';
  if (select.getClientRects().length) {
    const signature = [style.font, style.color, style.borderRadius, style.paddingLeft, style.paddingRight].join('|');
    if (signature !== control.styleSignature) {
      control.styleSignature = signature;
      button.style.font = style.font;
      button.style.color = style.color;
      button.style.borderRadius = style.borderRadius;
      button.style.paddingLeft = style.paddingLeft;
      button.style.paddingRight = '36px';
    }
  }
  shell.classList.toggle('cm-select-disabled', button.disabled);
  if (openControl === control && (button.disabled || shell.hidden || !select.isConnected || !button.getClientRects().length || select.closest('[inert]'))) close();
}

function enhance(select) {
  if (controls.has(select) || !eligible(select)) return;
  let shell = select.parentElement;
  if (!shell.classList.contains('cm-select-shell')) {
    shell = document.createElement('span');
    shell.className = 'cm-select-shell';
    select.before(shell);
    shell.append(select);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cm-select-trigger';
  button.setAttribute('role', 'combobox');
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('data-noedit', '');
  const menuId = 'cm-select-menu-' + ++serial;
  button.setAttribute('aria-controls', menuId);
  const text = document.createElement('span');
  text.className = 'cm-select-value';
  button.append(text);
  shell.append(button);
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  shell.classList.add('cm-select-ready');
  const control = { select, shell, button, text, menuId };
  controls.set(select, control);
  button.addEventListener('click', () => openControl === control ? close() : open(control));
  button.addEventListener('keydown', event => keydown(event, control));
  select.addEventListener('change', () => sync(control));
  select.addEventListener('focus', () => button.focus());
  select.addEventListener('invalid', () => button.focus());
  sync(control);
  if (document.activeElement === select) button.focus();
}

export function refresh() {
  for (const [select, control] of controls) {
    if (!select.isConnected) { if (openControl === control) close(); controls.delete(select); }
    else sync(control);
  }
  document.querySelectorAll('select').forEach(enhance);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; refresh(); });
}
new MutationObserver(records => {
  if (records.some(record => !record.target.closest?.('.cm-select-trigger,.cm-select-menu') &&
    (record.type !== 'attributes' || record.target.tagName === 'SELECT' || record.target.tagName === 'OPTION'))) schedule();
}).observe(document, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['disabled','selected','label','value','aria-invalid','aria-describedby','aria-label','aria-labelledby','required'] });
document.addEventListener('pointerdown', event => {
  if (openControl && !popup.contains(event.target) && !openControl.button.contains(event.target)) close();
});
document.addEventListener('focusin', event => { if (openControl && event.target !== openControl.button) close(); });
document.addEventListener('reset', () => requestAnimationFrame(refresh));
document.addEventListener('scroll', event => { if (popup && !popup.contains(event.target)) position(); }, true);
window.addEventListener('resize', () => { refresh(); position(); });
window.visualViewport?.addEventListener('resize', position);
window.visualViewport?.addEventListener('scroll', position);
window.CoverMateSelect = { refresh, close };
refresh();
