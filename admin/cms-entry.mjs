// Private Admin hub links select existing CMS tools without saving content.
function entryFromLocation(controller) {
  if (controller.ownerModeFromPath(location.pathname) !== 'admin' || !controller.state.admin) return null;
  const params = new URLSearchParams(location.search);
  const tab = params.get('cms_tab');
  if (!['sections', 'content', 'brand', 'theme', 'versions'].includes(tab)) return null;
  const sections = controller.state.routePage === 'motor' ? controller.buildMotorPageSections(controller.state.site) : controller.state.site.sections || [];
  const section = ['sections', 'content'].includes(tab) ? sections.find(item => item && item.id === params.get('cms_section')) : null;
  const groups = ['identity', 'credentials', 'contact', 'hours', 'display', 'Navigation'];
  const group = tab === 'brand' && groups.includes(params.get('cms_group')) ? params.get('cms_group') : '';
  return { key: location.pathname + location.search, tab, section, group };
}

export async function applyCmsEntry(controller) {
  const entry = entryFromLocation(controller);
  if (!entry || controller._cmsEntryKey === entry.key || controller._cmsEntryPending === entry.key) return;
  controller._cmsEntryPending = entry.key;
  try {
    const cm = await controller.firebase();
    if (!cm?.waitForAuth || !cm?.syncSessionFromCurrentUser || !(await cm.waitForAuth())) return;
    const result = await cm.syncSessionFromCurrentUser();
    if (!result?.ok || entryFromLocation(controller)?.key !== entry.key) return;
    controller._cmsEntryKey = entry.key;
    if (entry.tab === 'versions') {
      await controller.openVersionsTab();
      requestAnimationFrame(() => document.querySelector('[data-versions-workspace] h3')?.focus({ preventScroll: true }));
    } else if (entry.tab === 'sections' && entry.section) {
      controller.inspectOutlineSection(entry.section.id, entry.section.on !== false);
    } else if (entry.tab === 'content' && entry.section) {
      controller.selectContentSection(entry.section.id);
    } else if (entry.group === 'Navigation') {
      controller.openBrandGroup('Navigation');
    } else {
      const brandPreview = { identity: 'header', credentials: controller.state.routePage === 'motor' ? 'motor' : 'hero', contact: 'talk', hours: 'talk', display: 'footer' }[entry.group];
      controller.setState({ tab: entry.tab, ...(brandPreview ? { brandPreview } : {}) }, () => requestAnimationFrame(() => {
        if (!entry.group) return;
        const group = [...document.querySelectorAll('[data-brand-group]')].find(node => node.dataset.brandGroup === entry.group);
        if (!group) return;
        group.open = true;
        group.scrollIntoView({ block: 'nearest' });
        group.querySelector('summary')?.focus({ preventScroll: true });
        controller.syncOutlineHighlight();
      }));
    }
  } finally {
    if (controller._cmsEntryPending === entry.key) controller._cmsEntryPending = '';
  }
}
