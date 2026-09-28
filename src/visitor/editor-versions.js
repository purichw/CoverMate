// Compare canonical snapshots, not rendered HTML or untrusted version notes.
export function snapshotKey(value) {
  if (Array.isArray(value)) return '[' + value.map(snapshotKey).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + snapshotKey(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

export function versionChanges(before, after) {
  const rows = [];
  const display = value => value === undefined ? 'ไม่มีค่า' : value === '' ? '(ค่าว่าง)' : typeof value === 'boolean' ? (value ? 'เปิด' : 'ปิด') : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  const group = path => {
    if (path.startsWith('config.sections.')) return path.split('.').slice(0, 3).join('.');
    if (path.startsWith('config.motorPage.')) return path.split('.').slice(0, 3).join('.');
    return path.split('.').slice(0, 2).join('.');
  };
  const walk = (a, b, path) => {
    if (snapshotKey(a) === snapshotKey(b)) return;
    const keyed = list => Array.isArray(list) && list.length > 0 && list.every(item => item && typeof item === 'object' && typeof item.id === 'string') && new Set(list.map(item => item.id)).size === list.length;
    if (Array.isArray(a) && Array.isArray(b) && (keyed(a) || a.length === 0) && (keyed(b) || b.length === 0)) {
      if (snapshotKey(a.map(item => item.id)) !== snapshotKey(b.map(item => item.id))) walk(a.map(item => item.id).join(' → '), b.map(item => item.id).join(' → '), path + '.order');
      const left = new Map(a.map(item => [item.id, item])), right = new Map(b.map(item => [item.id, item]));
      for (const id of new Set([...left.keys(), ...right.keys()])) walk(left.get(id), right.get(id), path + '.@' + id);
    } else if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[key], b[key], path ? path + '.' + key : key);
    } else rows.push({ key: path, path, group: group(path), before: display(a), after: display(b) });
  };
  walk(before, after, '');
  return rows;
}

export function requestVersionRestore(editor, id) {
  if (editor.state.remoteBusy || editor.state.confirmAction) return;
  const version = editor.loadHist().find(entry => entry.id === id);
  if (!version?.config || !Array.isArray(version.config.sections)) return;
  const snapshot = editor.canonicalEditorSnapshot({ config:editor.normalizeConfig(version.config, { repeatableIds:true }), text:version.text || {} });
  editor._editorHistory?.breakGroup();
  editor.setState({ confirmAction: {
    kind:'restore-version', kicker:'กู้คืนเป็นฉบับร่าง', title:'กู้คืนเวอร์ชันนี้เป็น Draft?',
    body:'แทนที่ Draft ทั้งเว็บด้วยเวอร์ชันวันที่ ' + editor.absTime(version.ts) + ' รวม Home, Motor, ข้อความ TH / EN รูปภาพ และข้อมูลร่วม เว็บจริงจะไม่เปลี่ยนจนกด Publish หลังจากนี้ยังใช้ Undo เพื่อคืน Draft ก่อนกู้คืนได้',
    actionLabel:'กู้คืนเป็นฉบับร่าง', snapshot, versionId:id
  } }, () => editor.focusAdminConfirm());
}

export async function restoreVersionConfirmed(editor, action) {
  editor.invalidateDraftQueue();
  editor.setState({ remoteBusy:true, remoteAction:'restore', remoteError:'', toast:null });
  try {
    const restored = await editor.writeDraftSnapshot(action.snapshot);
    editor.recordEditorHistory(restored, { label:'กู้คืนเวอร์ชันลง Draft' });
    editor.applyEditorSnapshot(restored, false);
    editor.setState({ remoteBusy:false, remoteAction:'', remoteError:'' });
    editor.finishAdminConfirm();
    editor.closeVersionDetails();
    editor.showActionToast({ title:'กู้คืนเป็น Draft แล้ว', body:'เว็บจริงยังไม่เปลี่ยน ตรวจสอบ Draft ก่อน Publish หรือใช้ Undo เพื่อคืนงานก่อนกู้คืน' });
  } catch (error) {
    editor.noteRemoteError('กู้คืน Draft ไม่สำเร็จ', error);
    editor.finishAdminConfirm();
    editor.showActionToast({ kind:'error', title:'กู้คืนไม่สำเร็จ · Draft เดิมยังอยู่', body:editor.errorMessage(error) });
  }
}

export function versionKeydown(editor, event) {
  if (event.key === 'Escape' && !event.target.closest?.('[role="combobox"][aria-expanded="true"]')) { event.preventDefault(); editor.closeVersionDetails(); }
  if (event.key === 'Tab') {
    const controls = [...document.querySelectorAll('[data-version-dialog] button,[data-version-dialog] select')].filter(el => !el.disabled && el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !event.target.closest?.('[data-version-dialog]'))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !event.target.closest?.('[data-version-dialog]'))) { event.preventDefault(); first?.focus(); }
  }
  return;
}

export async function refreshVersionHistory(editor, HIST_CAP, K_HIST) {
  if (editor.state.versionsBusy) return;
  editor.setState({ versionsBusy:true, versionsError:'' });
  try {
    const cm = await editor.firebase();
    if (!cm?.loadVersions) throw new Error('เชื่อมต่อประวัติเวอร์ชันไม่ได้ กรุณาลองใหม่');
    const versions = await cm.loadVersions(HIST_CAP);
    if (!Array.isArray(versions)) throw new Error('อ่านประวัติเวอร์ชันไม่ได้ กรุณาลองใหม่');
    editor.writeJSON(K_HIST, versions.slice(0,HIST_CAP));
    editor.setState({ versionsBusy:false, versionsError:'', versionsPage:0 });
  } catch (error) {
    editor.setState({ versionsBusy:false, versionsError:editor.errorMessage(error) });
  }
}

function openVersionDetails(editor, id) {
  editor._versionReturnFocus = document.activeElement;
  editor.setState({ selectedVersion:id, versionOpen:true, versionCompare:'draft', versionDiffLimit:60 }, () => requestAnimationFrame(() => document.querySelector('[data-version-close]')?.focus()));
}

export function buildVersionHistoryView(editor) {
  const S = editor.state;
  const normalize = value => editor.canonicalEditorSnapshot({ config:editor.normalizeConfig(value.config, {repeatableIds:true}), text:value.text || {} });
  const draft = normalize(editor.currentSnapshot()), live = normalize(editor.loadLive());
  const liveKey = snapshotKey(live), draftKey = snapshotKey(draft);
  const labels = { brand:'แบรนด์', contact:'ช่องทางติดต่อ', footer:'ส่วนท้ายเว็บไซต์', site:'การแสดงผลเว็บไซต์', licenses:'ใบอนุญาต', advisor:'ข้อมูลที่ปรึกษา', homeDesign:'ภาพและดีไซน์หน้าแรก', seo:'SEO', mediaEdits:'รูปภาพและ Crop', motorPage:'ประกันรถยนต์', nav:'เมนูเว็บไซต์', header:'ส่วนหัวเว็บไซต์', theme:'ธีม', tokens:'ธีม', ui:'ข้อความส่วนกลาง' };
  const groupLabel = path => {
    const parts = path.split('.');
    if (parts[0] === 'text') return 'ข้อความเพิ่มเติม';
    if (parts[1] === 'sections') {
      const id = parts[2]?.replace(/^@/,'');
      const section = S.site.sections?.find(item => item.id === id);
      return ({hero:'Hero',talk:'ติดต่อเรา',faq:'คำถามที่พบบ่อย',insurers:'บริษัทประกัน'}[id]) || section?.th?.title || (id === 'order' ? 'ลำดับส่วนหน้า Home' : id);
    }
    if (parts[1] === 'motorPage') return 'Motor · ' + (parts[2] || 'เนื้อหา');
    return labels[parts[1]] || parts[1];
  };
  const history = editor.loadHist().filter(entry => entry && entry.id && entry.config && Array.isArray(entry.config.sections)).sort((a,b) => (Number(b.ts)||0)-(Number(a.ts)||0));
  const rows = history.map((entry,index) => {
    const snapshot = normalize(entry), isLive = snapshotKey(snapshot) === liveKey;
    const previous = history[index+1];
    const changes = previous ? versionChanges(normalize(previous),snapshot) : [];
    const groups = [...new Set(changes.map(change=>groupLabel(change.group)))];
    const actor = entry.createdBy?.name || entry.createdBy?.email || 'ไม่ระบุผู้บันทึก';
    const id = String(entry.id), date = new Date(entry.ts);
    return { id, key:id, shortId:id.length>12?id.slice(0,6)+'…'+id.slice(-4):id, snapshot, ts:entry.ts,
      stamp:entry.ts && Number.isFinite(date.getTime()) ? date.toLocaleString('th-TH',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}) : 'ไม่ระบุวันที่', actor, isLive, status:isLive?'ตรงกับ Live':'เผยแพร่แล้ว',
      summary:previous ? (groups.slice(0,3).join(' · ') || 'เนื้อหาไม่เปลี่ยนจากครั้งก่อน') : 'รายการเก่าสุดในประวัติที่โหลด',
      selected:S.selectedVersion===entry.id, open:()=>openVersionDetails(editor,entry.id), restore:()=>editor.restoreVersion(entry.id),
      hasOrigin:!!(entry.restoredFrom || entry.undoOf), origin:entry.restoredFrom ? 'กู้คืนจาก: '+String(entry.restoredFrom) : entry.undoOf ? 'ย้อนการเผยแพร่: '+String(entry.undoOf) : '' };
  });
  const filter = S.versionsFilter || 'all', query = (S.versionsQuery || '').trim().toLocaleLowerCase();
  let filtered = rows.filter(row => (filter==='all'||(filter==='live'?row.isLive:!row.isLive)) && (!query||[row.id,row.actor,row.stamp,row.summary].join(' ').toLocaleLowerCase().includes(query)));
  if (S.versionsSort === 'oldest') filtered = [...filtered].reverse();
  const page = Math.min(S.versionsPage || 0,Math.max(0,Math.ceil(filtered.length/5)-1));
  const selected = rows.find(row=>row.id===S.selectedVersion);
  const target = S.versionCompare === 'live' ? live : draft;
  const differences = selected ? versionChanges(selected.snapshot,target).map(change=>({...change,label:groupLabel(change.group)})) : [];
  return {
    versionsReady:true,
    versionsBusy:!!S.versionsBusy, versionsError:S.versionsError || '', versionsFailed:!!S.versionsError,
    versionsHasRows:filtered.length>0, versionsEmpty:!S.versionsBusy&&!S.versionsError&&!rows.length,
    versionsNoMatch:rows.length>0&&!filtered.length, versionsRows:filtered.slice(page*5,page*5+5),
    versionsQuery:S.versionsQuery || '', versionsSort:S.versionsSort || 'newest',
    onVersionsQuery:event=>editor.setState({versionsQuery:event.target.value,versionsPage:0}),
    onVersionsSort:event=>editor.setState({versionsSort:event.target.value,versionsPage:0}),
    clearVersionsFilters:()=>editor.setState({versionsQuery:'',versionsFilter:'all',versionsPage:0}),
    versionsFilters:[['all','ทั้งหมด'],['live','ตรงกับ Live'],['previous','เวอร์ชันอื่น']].map(([id,label])=>({id,label,count:rows.filter(row=>id==='all'||(id==='live'?row.isLive:!row.isLive)).length,active:filter===id,choose:()=>editor.setState({versionsFilter:id,versionsPage:0})})),
    versionsRange:filtered.length ? `${page*5+1}–${Math.min((page+1)*5,filtered.length)} จาก ${filtered.length} เวอร์ชัน` : '',
    versionsHasPages:filtered.length>5, versionsPrevDisabled:page===0, versionsNextDisabled:(page+1)*5>=filtered.length,
    versionsPrev:()=>page>0&&editor.setState({versionsPage:page-1}), versionsNext:()=>(page+1)*5<filtered.length&&editor.setState({versionsPage:page+1}),
    refreshVersions:()=>editor.refreshVersionHistory(),
    versionDraftStatus:draftKey===liveKey?'เนื้อหาตรงกับ Live':'มีการแก้ไขที่ยังไม่เผยแพร่',
    versionLiveStamp:rows.find(row=>row.isLive)?.stamp || 'ไม่มีรายการที่ตรงกับ Live ในประวัติที่โหลด',
    versionLiveId:rows.find(row=>row.isLive)?.shortId || 'Live',
    versionDetail:selected || {}, showVersionDetail:!!(S.admin||S.editMode)&&!!S.versionOpen&&!!selected,
    closeVersionDetail:()=>editor.closeVersionDetails(),
    versionCompare:S.versionCompare || 'draft', onVersionCompare:event=>editor.setState({versionCompare:event.target.value,versionDiffLimit:60}),
    versionCompareLabel:S.versionCompare==='live'?'Live ปัจจุบัน':'Draft ปัจจุบัน',
    versionDifferences:differences.slice(0,S.versionDiffLimit||60), versionDifferenceCount:differences.length,
    versionSame:!!selected&&!differences.length, versionMoreDiff: differences.length>(S.versionDiffLimit||60),
    versionLoadMore:()=>editor.setState({versionDiffLimit:(S.versionDiffLimit||60)+60}),
    versionRestoreDisabled:!!S.remoteBusy || !selected || snapshotKey(selected.snapshot)===draftKey
  };
}
