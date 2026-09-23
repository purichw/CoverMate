import { createEditorHistory } from './editor-history.js';

/**
 * CMS editing and persistence controller for the existing visitor renderer.
 * The host owns rendering/state, normalization, live/draft reads and DOM copy
 * projection. Explicit dependencies are the shared schema and cache contract.
 * This controller owns editor commands, draft scheduling, history and media.
 * Firebase stays lazy; persistence still enforces the verified admin role.
 */
export function withCmsController(Base, {
  DEFAULTS, clone, K_DRAFT, K_DRAFT_TEXT, K_LIVE, K_LIVE_TEXT, K_HIST, HIST_CAP, CMS_CONTENT_FIELDS, isSemanticCopyPath, setCmsCopy, cmsGet, cmsSet, cmsMedia, cmsImageSlots, cmsAdminMediaLabel, repeatableIndex, createRepeatableId, usedRepeatableIds
}) {
  return class CmsController extends Base {
    async firebase() {
      if (!/^https?:$/.test(window.location.protocol)) return null;
      await import(window.location.origin + '/covermate-firebase.js');
      return window.CoverMateFirebase || null;
    }

    canonicalEditorSnapshot(snapshot) {
      const clean = window.CoverMateContract.sanitizeStateDoc(snapshot, { repeatableIds: true });
      return { config: clone(clean.config), text: clone(clean.text || {}) };
    }

    initEditorHistory(snapshot) {
      const current = this.canonicalEditorSnapshot(snapshot);
      const session = this.readJSON('covermate-admin-session') || {};
      const key = 'covermate-editor-history-v1:' + (window.CoverMateEnvironment?.siteId || location.host) + ':' + (session.uid || session.email || 'owner');
      if (this._editorHistory && this._editorHistoryKey === key) {
        // A hydration/reload from another session must not attach stale history.
        if (this._editorHistory.restore(this._editorHistory.serialize(), current)) return;
      }
      this._editorHistory = createEditorHistory(current);
      this._editorHistoryKey = key;
      try { this._editorHistory.restore(sessionStorage.getItem(key), current); } catch (_) {}
      this.persistEditorHistory();
    }

    persistEditorHistory() {
      if (!this._editorHistory) return;
      try {
        const payload = this._editorHistory.serialize();
        if (payload) sessionStorage.setItem(this._editorHistoryKey, payload);
        else sessionStorage.removeItem(this._editorHistoryKey);
        this._editorHistoryStored = !!payload;
      } catch (_) { this._editorHistoryStored = false; }
    }

    recordEditorHistory(snapshot, options) {
      if (!this._editorHistory || this._applyingHistory) return;
      const gesture = this._editorGesture;
      const opts = options || (gesture && Date.now() - gesture.at < 1100 ? gesture : { label: 'แก้ไขเนื้อหาหรือการจัดวาง' });
      this._editorHistory.record(this.canonicalEditorSnapshot(snapshot), opts);
      this.persistEditorHistory();
      // Inline editing otherwise does not render the toolbar state.
      this.setState({ editorHistoryRevision: (this.state.editorHistoryRevision || 0) + 1 });
    }

    invalidateDraftQueue() {
      clearTimeout(this._remoteDraftT);
      this._draftGeneration = (this._draftGeneration || 0) + 1;
      return this._draftGeneration;
    }

    applyEditorSnapshot(snapshot, autosave = true) {
      const clean = this.canonicalEditorSnapshot(snapshot);
      this._applyingHistory = true;
      this.restoreAppliedText();
      this.textOv = clone(clean.text);
      this.writeJSON(K_DRAFT, clean.config);
      this.writeJSON(K_DRAFT_TEXT, clean.text);
      this._lastSaved = Date.now();
      // Advanced JSON/import buffers are not committed Draft content. Preserve
      // them across history operations instead of silently discarding typing.
      this.setState({ site: clean.config, cmsEdits: {},
        editorHistoryRevision: (this.state.editorHistoryRevision || 0) + 1 }, () => {
        this.syncSeo();
        requestAnimationFrame(() => {
          this.applyText();
          if (this.state.editMode) this.enableEdit();
          this._applyingHistory = false;
        });
      });
      if (autosave) this.queueRemoteDraft(clean.config, clean.text);
      this.persistEditorHistory();
    }

    stepEditorHistory(direction) {
      if (this.state.remoteBusy || this.state.confirmAction || !this._editorHistory || this._applyingHistory) return;
      const result = this._editorHistory[direction]();
      if (!result) return;
      this._editorGesture = null;
      this.invalidateDraftQueue();
      this.dismissToast();
      this.applyEditorSnapshot(result.snapshot);
      this.setState({ editorAnnouncement: (direction === 'undo' ? 'Undo: ' : 'Redo: ') + result.label });
    }

    editorKeydown(event) {
      if (!(this.state.admin || this.state.editMode)) return;
      if (this.state.confirmAction) {
        if (event.key === 'Escape') { event.preventDefault(); this.cancelConfirm(); }
        if (event.key === 'Tab') {
          const buttons = [...document.querySelectorAll('[data-admin-confirm] button')];
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && (document.activeElement === first || !document.activeElement?.closest('[data-admin-confirm]'))) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || !document.activeElement?.closest('[data-admin-confirm]'))) { event.preventDefault(); first?.focus(); }
        }
        return;
      }
      if (this.state.remoteBusy || event.isComposing || event.altKey || !(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === 's') { event.preventDefault(); document.activeElement?.blur(); this.requestSaveDraft(); return; }
      if (!['z', 'y'].includes(key)) return;
      // Uncommitted form fields and the media dialog keep their native text Undo.
      const nativeField = event.target.closest?.('input,textarea,select,[contenteditable="true"]');
      if (nativeField && !nativeField.hasAttribute('data-ek')) return;
      if (document.querySelector('[role="dialog"][data-media-editor]')) return;
      event.preventDefault();
      this.stepEditorHistory(key === 'y' || event.shiftKey ? 'redo' : 'undo');
    }

    focusAdminConfirm() {
      this._confirmReturnFocus = document.activeElement;
      requestAnimationFrame(() => document.querySelector('[data-confirm-cancel]')?.focus());
    }

    finishAdminConfirm() {
      this.setState({ confirmAction: null });
      requestAnimationFrame(() => this._confirmReturnFocus?.isConnected && this._confirmReturnFocus.focus({ preventScroll: true }));
    }

    requestResetDraft() {
      if (this.state.remoteBusy) return;
      this._editorHistory?.breakGroup();
      this.setState({ confirmAction: {
        kind: 'reset', kicker: 'Reset Draft', title: 'กลับไปยัง Publish ล่าสุด?',
        body: 'แทนที่ Draft ทั้งเว็บด้วยเวอร์ชันที่ Publish ล่าสุด รวมข้อความ TH / EN รูปภาพ และการจัดวาง เว็บจริงจะไม่เปลี่ยน หลัง Reset ยังใช้ Undo เพื่อคืนงานก่อนหน้านี้ได้' + ((this.state.calculatorCatalogDraft !== null || this.state.calculatorReferenceDraft !== null) ? ' ข้อความ JSON ที่ยังไม่กด Save จะยังอยู่ในช่องแก้ไข' : ''),
        actionLabel: 'Reset Draft'
      } }, () => this.focusAdminConfirm());
    }

    async resetDraftConfirmed() {
      this.invalidateDraftQueue();
      this.setState({ remoteBusy: true, remoteAction: 'reset', remoteError: '', toast: null });
      try {
        const cm = await this.firebase();
        if (!cm?.resetDraftToPublished) throw new Error('เชื่อมต่อระบบจัดการเนื้อหาไม่ได้ กรุณาลองใหม่');
        const snapshot = await cm.resetDraftToPublished();
        this.recordEditorHistory(snapshot, { label: 'Reset ไปยัง Publish ล่าสุด' });
        this.applyEditorSnapshot(snapshot, false);
        this.setState({ remoteBusy: false, remoteAction: '', remoteError: '' });
        this.finishAdminConfirm();
        this.showActionToast({ title: 'Reset Draft แล้ว', body: 'Draft ตรงกับ Publish ล่าสุดแล้ว เว็บจริงไม่เปลี่ยน กด Undo เพื่อคืนงานก่อน Reset ได้' });
      } catch (error) {
        this.noteRemoteError('Reset Draft ไม่สำเร็จ', error);
        this.finishAdminConfirm();
        this.showActionToast({ kind: 'error', title: 'Reset ไม่สำเร็จ · งานเดิมยังอยู่', body: this.errorMessage(error) });
      }
    }

    queueRemoteDraft(config, text) {
      if (!this.hasSession()) return;
      const cfg = this.normalizeConfig(config || this.state.site, { repeatableIds: true });
      const txt = this.sanitizeTextOverrides(text || this.textOv || {});
      const generation = this.invalidateDraftQueue();
      this._remoteDraftT = setTimeout(() => this.saveDraftRemoteNow(cfg, txt, generation), 700);
    }

    async saveDraftRemoteNow(config, text, generation) {
      try {
        const cm = await this.firebase();
        if (!cm || !cm.saveSiteState || generation !== this._draftGeneration) return false;
        await cm.saveSiteState('draft', this.normalizeConfig(config, { repeatableIds: true }), this.sanitizeTextOverrides(text || {}), { cache: false });
        if (generation === this._draftGeneration && this.state.remoteError && /^(Draft save failed|บันทึก Draft ไม่สำเร็จ)/.test(this.state.remoteError)) this.setState({ remoteError: '' });
        return true;
      } catch (e) {
        if (generation === this._draftGeneration) this.noteRemoteError('บันทึก Draft ไม่สำเร็จ', e);
        return false;
      }
    }

    noteRemoteError(prefix, error) {
      const msg = this.errorMessage(error);
      console.warn('[covermate] ' + prefix + ':', error);
      this.setState({ remoteBusy: false, remoteAction: '', remoteError: prefix + ': ' + msg });
    }

    errorMessage(error) {
      if (error?.code === 'content-conflict') return 'มีการแก้ไขจากอีกหน้าต่าง งานของคุณยังอยู่ กรุณาสำรอง Draft แล้วโหลดข้อมูลล่าสุดก่อนลองใหม่';
      if (/permission-denied|unauthenticated|auth\//.test(error?.code || '')) return 'ยืนยันสิทธิ์ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง';
      if (['TimeoutError', 'AbortError', 'TypeError'].includes(error?.name)) return 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
      return /[ก-๙]/.test(error?.message || '') ? error.message : 'ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง';
    }

    currentSnapshot() {
      const cfg = this.normalizeConfig(this.pendingInlineConfig(), { repeatableIds: true });
      const txt = this.sanitizeTextOverrides(this.textOv || {});
      return { config: clone(cfg), text: clone(txt) };
    }

    showActionToast(opts) {
      clearTimeout(this._toastT);
      const canUndo = !!(opts && opts.undoSnapshot);
      const id = 'toast-' + Date.now() + '-' + Math.random().toString(16).slice(2);
      const toast = {
        id,
        kind: (opts && opts.kind) || 'success',
        title: (opts && opts.title) || 'เรียบร้อย',
        body: (opts && opts.body) || '',
        undoSnapshot: canUndo ? clone(opts.undoSnapshot) : null,
        undoKind: (opts && opts.undoKind) || '',
        versionId: (opts && opts.versionId) || '',
        expiresAt: canUndo ? Date.now() + 30000 : 0
      };
      this.setState({ toast });
      if (canUndo) {
        this._toastT = setTimeout(() => {
          const cur = this.state.toast;
          if (cur && cur.id === id) {
            this.setState({ toast: Object.assign({}, cur, { undoSnapshot: null, expiresAt: 0, body: cur.body + ' หมดเวลาย้อนกลับแล้ว' }) });
          }
        }, 30000);
      }
    }

    dismissToast() {
      clearTimeout(this._toastT);
      this.setState({ toast: null });
    }

    requestSaveDraft() {
      if (this.state.remoteBusy) return;
      this.setState({
        confirmAction: {
          kind: 'save',
          title: 'Save draft นี้ไหม?',
          body: 'บันทึก Draft นี้ลง Firestore ผู้เข้าชมจะยังเห็นเว็บเวอร์ชันที่ Publish ไว้',
          actionLabel: 'Save draft',
          kicker: 'บันทึก Draft',
          undoSnapshot: null
        }
      }, () => this.focusAdminConfirm());
    }

    requestPublish() {
      if (this.state.remoteBusy || !this.dirtyVs(this.state.site, this.textOv)) return;
      this.setState({
        confirmAction: {
          kind: 'publish',
          title: 'Publish การแก้ไขนี้ไหม?',
          body: 'การแก้ไขใน Draft จะแสดงบนเว็บจริง หลัง Publish สำเร็จสามารถ Undo ได้ภายใน 30 วินาที',
          actionLabel: 'Publish',
          kicker: 'อัปเดตเว็บจริง',
          undoSnapshot: this.loadLive()
        }
      }, () => this.focusAdminConfirm());
    }

    cancelConfirm() {
      if (this.state.remoteBusy) return;
      this.finishAdminConfirm();
    }

    confirmAdminAction() {
      const action = this.state.confirmAction;
      if (!action || this.state.remoteBusy) return;
      if (action.kind === 'save') this.saveDraftConfirmed(action.undoSnapshot);
      else if (action.kind === 'publish') this.publishConfirmed(action.undoSnapshot);
      else if (action.kind === 'reset') this.resetDraftConfirmed();
    }

    async writeDraftSnapshot(snapshot) {
      const cfg = this.normalizeConfig(snapshot.config || DEFAULTS, { repeatableIds: true });
      const txt = this.sanitizeTextOverrides(snapshot.text || {});
      this.invalidateDraftQueue();
      const cm = await this.firebase();
      if (!cm || !cm.saveSiteState) throw new Error('เชื่อมต่อระบบจัดการเนื้อหาไม่ได้ กรุณาลองใหม่');
      await cm.saveSiteState('draft', cfg, txt);
      this.textOv = clone(txt);
      this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
      this._lastSaved = Date.now();
      return { config: cfg, text: txt };
    }

    async writePublishedSnapshot(snapshot, metadata) {
      const cfg = this.normalizeConfig(snapshot.config || DEFAULTS, { repeatableIds: true });
      const txt = this.sanitizeTextOverrides(snapshot.text || {});
      this.invalidateDraftQueue();
      const cm = await this.firebase();
      if (!cm || !cm.publishSiteState) throw new Error('เชื่อมต่อระบบจัดการเนื้อหาไม่ได้ กรุณาลองใหม่');
      const version = await cm.publishSiteState(cfg, txt, metadata || {});
      this.textOv = clone(txt);
      this.writeJSON(K_LIVE, cfg); this.writeJSON(K_LIVE_TEXT, txt);
      this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
      const hist = this.loadHist();
      if (!hist.some(h => h.id === version.id)) hist.unshift({ id: version.id, ts: version.ts || Date.now(), config: cfg, text: txt, undoOf: metadata && metadata.undoOf });
      while (hist.length > HIST_CAP) hist.pop();
      this.writeJSON(K_HIST, hist);
      this._lastSaved = Date.now();
      return { version, config: cfg, text: txt };
    }

    async saveDraftConfirmed(undoSnapshot) {
      const snapshot = this.currentSnapshot();
      this.textOv = clone(snapshot.text);
      this.writeJSON(K_DRAFT, snapshot.config); this.writeJSON(K_DRAFT_TEXT, snapshot.text);
      this.setState({ site: snapshot.config, remoteBusy: true, remoteAction: 'save', remoteError: '', toast: null });
      try {
        await this.writeDraftSnapshot(snapshot);
        this.setState({ site: snapshot.config, savedFlash: true, remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
        this.finishAdminConfirm();
        clearTimeout(this._flashT); this._flashT = setTimeout(() => this.setState({ savedFlash: false }), 1600);
        this.showActionToast({
          kind: 'success',
          title: 'บันทึก Draft แล้ว',
          body: 'บันทึก Draft ลง Firestore แล้ว ผู้เข้าชมยังเห็นเวอร์ชันที่ Publish ไว้'
        });
      } catch (e) {
        this.noteRemoteError('บันทึก Draft ไม่สำเร็จ', e);
        this.finishAdminConfirm();
        this.showActionToast({ kind: 'error', title: 'บันทึกไม่สำเร็จ', body: this.errorMessage(e) });
      }
    }

    async publishConfirmed(undoSnapshot) {
      await this.doPublish({ undoSnapshot });
    }

    async undoActionToast() {
      const toast = this.state.toast;
      if (this.state.remoteBusy || !toast || !toast.undoSnapshot || (toast.expiresAt && Date.now() > toast.expiresAt)) return;
      const snapshot = clone(toast.undoSnapshot);
      clearTimeout(this._toastT);
      if (toast.undoKind === 'save') {
        this.setState({ remoteBusy: true, remoteAction: 'save', remoteError: '', toast: null });
        try {
          const restored = await this.writeDraftSnapshot(snapshot);
          this.setState({ site: restored.config, remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
          this.showActionToast({ kind: 'success', title: 'กู้คืน Draft แล้ว', body: 'กู้คืน Draft ก่อนหน้าใน Firestore แล้ว' });
        } catch (e) {
          this.noteRemoteError('ย้อนกลับ Draft ไม่สำเร็จ', e);
          this.showActionToast({ kind: 'error', title: 'Undo ไม่สำเร็จ', body: this.errorMessage(e) });
        }
        return;
      }
      if (toast.undoKind === 'publish') {
        this.setState({ remoteBusy: true, remoteAction: 'publish', remoteError: '', toast: null });
        try {
          const restored = await this.writePublishedSnapshot(snapshot, { undoOf: toast.versionId || 'latest-publish' });
          this.recordEditorHistory(restored, { label: 'ย้อน Publish' });
          this.applyEditorSnapshot(restored, false);
          this.setState({ site: restored.config, lastPublished: Date.now(), remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
          this.showActionToast({ kind: 'success', title: 'Undo การ Publish แล้ว', body: 'เว็บจริงกลับไปใช้เวอร์ชันที่ Publish ก่อนหน้าแล้ว' });
        } catch (e) {
          this.noteRemoteError('Undo การ Publish ไม่สำเร็จ', e);
          this.showActionToast({ kind: 'error', title: 'Undo ไม่สำเร็จ', body: this.errorMessage(e) });
        }
      }
    }

    persistDraft() {
      const cfg = this.normalizeConfig(this.pendingInlineConfig(), { repeatableIds: true }), txt = this.sanitizeTextOverrides(this.textOv || {});
      this.textOv = clone(txt);
      this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
      this._lastSaved = Date.now();
      this.queueRemoteDraft(cfg, txt);
    }

    async doPublish(options) {
      const snapshot = this.currentSnapshot();
      this.textOv = clone(snapshot.text);
      this.writeJSON(K_DRAFT, snapshot.config); this.writeJSON(K_DRAFT_TEXT, snapshot.text);
      this.setState({ site: snapshot.config, remoteBusy: true, remoteAction: 'publish', remoteError: '', toast: null });
      try {
        const result = await this.writePublishedSnapshot(snapshot);
        this.finishAdminConfirm();
        this.setState({ site: result.config, lastPublished: Date.now(), pubFlash: true, remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
        clearTimeout(this._pubT); this._pubT = setTimeout(() => this.setState({ pubFlash: false }), 1900);
        this.showActionToast({
          kind: 'success',
          title: 'Publish แล้ว',
          body: 'เว็บจริงแสดง Draft นี้แล้ว สามารถ Undo ได้ภายใน 30 วินาที',
          undoKind: 'publish',
          undoSnapshot: options && options.undoSnapshot,
          versionId: result.version && result.version.id
        });
      } catch (e) {
        this.writeJSON(K_DRAFT, snapshot.config); this.writeJSON(K_DRAFT_TEXT, snapshot.text);
        this.noteRemoteError('Publish ไม่สำเร็จ', e);
        this.finishAdminConfirm();
        this.showActionToast({ kind: 'error', title: 'Publish ไม่สำเร็จ', body: this.errorMessage(e) });
      }
    }

    async restoreVersion(id) {
      if (this.state.remoteBusy) return;
      const e = this.loadHist().find(h => h.id === id); if (!e) return;
      const cfg = this.normalizeConfig(e.config, { repeatableIds: true }), txt = clone(e.text || {});
      this.setState({ remoteBusy: true, remoteError: '' });
      try {
        this.invalidateDraftQueue();
        const cm = await this.firebase();
        if (!cm || !cm.publishSiteState) throw new Error('เชื่อมต่อระบบจัดการเนื้อหาไม่ได้ กรุณาลองใหม่');
        const version = await cm.publishSiteState(cfg, txt, { restoredFrom: e.ts || e.id });
        this.textOv = clone(txt);
        this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
        this.writeJSON(K_LIVE, cfg); this.writeJSON(K_LIVE_TEXT, txt);
        const hist = this.loadHist();
        if (!hist.some(h => h.id === version.id)) hist.unshift({ id: version.id, ts: version.ts || Date.now(), restoredFrom: e.ts || e.id, config: cfg, text: txt });
        while (hist.length > HIST_CAP) hist.pop();
        this.writeJSON(K_HIST, hist);
        this._lastSaved = Date.now();
        this.recordEditorHistory({ config: cfg, text: txt }, { label: 'กู้คืนเวอร์ชันที่ Publish' });
        this.setState({ site: cfg, lastPublished: Date.now(), remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
      } catch (err) {
        this.textOv = clone(txt);
        this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
        this.noteRemoteError('กู้คืนไม่สำเร็จ', err);
        this.recordEditorHistory({ config: cfg, text: txt }, { label: 'โหลดเวอร์ชันลง Draft' });
        this.setState({ site: cfg }, () => requestAnimationFrame(() => this.applyText()));
      }
    }

    saveText() {
      const txt = this.sanitizeTextOverrides(this.textOv || {});
      this.textOv = clone(txt);
      this.writeJSON(K_DRAFT_TEXT, txt);
      this._lastSaved = Date.now();
      const config = this.pendingInlineConfig();
      this.writeJSON(K_DRAFT, config);
      this.recordEditorHistory({ config, text: txt });
      this.queueRemoteDraft(config, txt);
    }

    pendingInlineConfig() {
      const config = clone(this.state.site || DEFAULTS);
      Object.keys(this.textOv || {}).filter(key => key.startsWith('cms:')).forEach(key => {
        const path = key.slice(4);
        if (isSemanticCopyPath(config, path)) setCmsCopy(config, path, this.textOv[key]);
      });
      CMS_CONTENT_FIELDS.filter(field => field.localized).forEach(field => ['th', 'en'].forEach(lang => {
        const path = field.path + '.' + lang;
        if (Object.prototype.hasOwnProperty.call(this.textOv || {}, 'cms:' + path)) setCmsCopy(config, path, this.textOv['cms:' + path]);
      }));
      return config;
    }

    saveInlineText(el, commit) {
      if (this._applyingHistory || this.state.remoteBusy) return;
      const path = this.cmsCopyPath(el);
      if (!this.textOv) this.textOv = this.loadText();
      if (path) {
        this.textOv['cms:' + path] = el.textContent || '';
        if (commit) {
          const site = this.pendingInlineConfig();
          delete this.textOv['cms:' + path];
          this.save(site);
        } else this.saveText();
      } else {
        if (!this.textOv) this.textOv = this.loadText();
        this.textOv[el.getAttribute('data-ek')] = el.textContent || '';
        this.saveText();
      }
      this.markEditableEmpty(el);
    }

    disableEdit() {
      this.clearInlineMedia();
      document.querySelectorAll('.om-editable,[contenteditable="true"][data-ek]').forEach((el) => {
        el.removeAttribute('contenteditable');
        el.removeAttribute('spellcheck');
        el.removeAttribute('data-om-empty');
        el.removeAttribute('data-empty-label');
        el.classList.remove('om-editable');
      });
    }

    enableEdit() {
      this.syncInlineMedia();
      const self = this;
      this.eachEditable((el, key) => {
        const path = this.cmsCopyPath(el);
        el.setAttribute('data-ek', path ? 'cms:' + path : key);
        if (el.getAttribute('contenteditable') !== 'true') {
          el.setAttribute('contenteditable', 'true');
          el.setAttribute('spellcheck', 'false');
          el.classList.add('om-editable');
        }
        if (!el.__omEdit) {
          el.__omEdit = true;
          el.addEventListener('input', function () { self.saveInlineText(el); });
          el.addEventListener('blur', function () {
            const text = el.textContent || '';
            if (!text.trim()) el.textContent = '';
            self.saveInlineText(el, true);
          });
          el.addEventListener('click', function (e) { if (self.state.editMode) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
        }
        this.markEditableEmpty(el);
      });
    }

    save(site) {
      if (this.state.remoteBusy || this._applyingHistory) return;
      const cfg = this.normalizeConfig(site, { repeatableIds: true }), txt = clone(this.textOv || {});
      this.recordEditorHistory({ config: cfg, text: txt });
      this.setState({ site: cfg });
      this.writeJSON(K_DRAFT, cfg);
      this.writeJSON(K_DRAFT_TEXT, txt);
      this._lastSaved = Date.now();
      this.queueRemoteDraft(cfg, txt);
    }

    findConfigSectionById(config, sectionId) {
      if (!config || !sectionId) return null;
      const shared = (config.sections || []).find(x => x && x.id === sectionId);
      if (shared) return shared;
      const motor = config.motorPage || {};
      return ['hero', 'trust', 'cover'].map(key => motor[key]).find(x => x && x.id === sectionId) || null;
    }

    upd(fn) {
      if (this.state.remoteBusy || this._applyingHistory) return;
      const s = this.pendingInlineConfig(), before = clone(s);
      fn(s);
      Object.keys(this.textOv || {}).filter(key => key.startsWith('cms:')).forEach(key => {
        if (cmsGet(before, key.slice(4)) !== cmsGet(s, key.slice(4))) delete this.textOv[key];
      });
      this.save(s);
    }

    secIdx(id) { return this.state.site.sections.findIndex(x => x.id === id); }

    move(id, dir) {
      this.upd(s => {
        const i = s.sections.findIndex(x => x.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= s.sections.length) return;
        const t = s.sections[i]; s.sections[i] = s.sections[j]; s.sections[j] = t;
      });
    }

    moveRepeatable(sectionId, key, itemId, fallbackIndex, dir) {
      this.upd(s => {
        const section = this.findConfigSectionById(s, sectionId);
        const list = section && section[key];
        const i = repeatableIndex(list, itemId, fallbackIndex);
        const j = i + dir;
        if (!Array.isArray(list) || i < 0 || j < 0 || j >= list.length) return;
        const item = list[i]; list[i] = list[j]; list[j] = item;
        if (key === 'heads') (section.items || []).forEach(row => {
          const status = row.st || [];
          const value = status[i]; status[i] = status[j]; status[j] = value;
        });
      });
    }

    duplicateRepeatable(sectionId, key, itemId, fallbackIndex) {
      this.upd(s => {
        const section = this.findConfigSectionById(s, sectionId);
        const list = section && section[key];
        const i = repeatableIndex(list, itemId, fallbackIndex);
        if (!Array.isArray(list) || i < 0) return;
        const copy = clone(list[i]);
        copy.id = createRepeatableId(section, key, usedRepeatableIds(section, key));
        if (Object.prototype.hasOwnProperty.call(copy, 'n')) copy.n = String(list.length + 1);
        list.splice(i + 1, 0, copy);
      });
    }

    removeRepeatable(sectionId, key, itemId, fallbackIndex) {
      this.upd(s => {
        const section = this.findConfigSectionById(s, sectionId);
        const list = section && section[key];
        const i = repeatableIndex(list, itemId, fallbackIndex);
        if (!Array.isArray(list) || i < 0) return;
        if (list[i] && typeof list[i] === 'object') list[i].on = false;
      });
    }

    restoreRepeatable(sectionId, key, itemId, fallbackIndex) {
      this.upd(s => {
        const section = this.findConfigSectionById(s, sectionId);
        const list = section && section[key];
        const i = repeatableIndex(list, itemId, fallbackIndex);
        if (!Array.isArray(list) || i < 0) return;
        if (list[i] && typeof list[i] === 'object') list[i].on = true;
      });
    }

    clearInlineMedia() {
      this._inlineMediaLayer?.remove();
      this._inlineMediaLayer = null;
      this._inlineMediaButtons = new Map();
    }

    syncInlineMedia() {
      if (!this.state.editMode || this.state.preview || !this.hasSession() || this.state.menuOpen) {
        if (this._inlineMediaLayer) this.clearInlineMedia();
        return;
      }
      // Keep real buttons outside links, summaries and calculator buttons. The
      // overlay follows the image without wrapping it or changing public layout.
      if (!this._inlineMediaLayer) {
        this._inlineMediaLayer = document.createElement('div');
        this._inlineMediaLayer.className = 'om-inline-media-layer';
        this._inlineMediaLayer.setAttribute('data-noedit', 'true');
        document.body.append(this._inlineMediaLayer);
        this._inlineMediaButtons = new Map();
      }
      const slots = new Map(cmsImageSlots(this.state.site, this.state.lang).map(slot => [slot.path, slot]));
      const header = document.querySelector('header');
      const headerBottom = header && ['sticky', 'fixed'].includes(getComputedStyle(header).position) ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      const seen = new Set();
      document.querySelectorAll('header [data-cms-image], main [data-cms-image], footer [data-cms-image], main [data-cms-background]').forEach(image => {
        const background = image.hasAttribute('data-cms-background');
        const path = image.getAttribute(background ? 'data-cms-background' : 'data-cms-image');
        const slot = slots.get(path);
        if (!slot || !image.getClientRects().length || (image.checkVisibility && !image.checkVisibility({ visibilityProperty: true }))) return;
        let rect = image.getBoundingClientRect();
        const compactBackground = background && innerWidth <= 600;
        if (background) rect = { left: rect.right - (compactBackground ? 52 : 168), right: rect.right - 12, top: rect.top + 12, bottom: rect.top + 52 };
        let left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right);
        let top = Math.max(image.closest('header') ? 0 : headerBottom, rect.top), bottom = Math.min(innerHeight, rect.bottom);
        for (let parent = image.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
          const style = getComputedStyle(parent), box = parent.getBoundingClientRect();
          if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) { left = Math.max(left, box.left); right = Math.min(right, box.right); }
          if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) { top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom); }
        }
        if (right - left < 12 || bottom - top < 12) return;
        seen.add(image);
        let button = this._inlineMediaButtons.get(image);
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.addEventListener('click', () => {
            if (!this.state.editMode || this.state.preview || !this.hasSession()) return;
            button.focus({ preventScroll: true });
            this.editMedia(button.getAttribute('data-inline-media'));
          });
          this._inlineMediaLayer.append(button);
          this._inlineMediaButtons.set(image, button);
        }
        button.className = 'om-inline-media-button' + (background ? ' om-inline-media-background' : right - left < 48 || bottom - top < 40 ? ' om-inline-media-small' : '');
        button.setAttribute('data-inline-media', path);
        button.setAttribute('aria-label', 'แก้ไขรูป: ' + cmsAdminMediaLabel(slot));
        button.setAttribute('aria-haspopup', 'dialog');
        button.title = 'แก้ไขรูป: ' + cmsAdminMediaLabel(slot);
        button.textContent = background ? (compactBackground ? '✎' : 'Edit background') : '';
        button.style.cssText = `left:${left}px;top:${top}px;width:${right-left}px;height:${bottom-top}px`;
      });
      this._inlineMediaButtons.forEach((button, image) => {
        if (!seen.has(image)) { button.remove(); this._inlineMediaButtons.delete(image); }
      });
    }

    async editMedia(path) {
      if (!this.hasSession()) return;
      const slot = cmsImageSlots(this.state.site,this.state.lang).find(item => item.path === path);
      if (!slot) return;
      try {
        const editor = await import(window.location.origin + '/admin/media-editor.js');
        await editor.editImage({slot:{...slot,label:cmsAdminMediaLabel(slot)},lang:'th',source:this.state.site.mediaEdits?.[path]?.source || slot.value,
          getToken:async()=>{const firebase=await this.firebase();return firebase.getAdminIdToken(true);},
          onApply:result=>{
            if (!cmsImageSlots(this.state.site,this.state.lang).some(item=>item.path===path) || String(cmsGet(this.state.site,path) || '') !== slot.value) throw Error('รูปนี้ถูกเปลี่ยนระหว่างที่แก้ไข กรุณาปิดแล้วเปิดตัวแก้ไขรูปอีกครั้ง');
            if (result.url && !cmsMedia(result.url)) throw Error('URL รูปภาพไม่ถูกต้อง');
            this.upd(config=>{cmsSet(config,path,result.url);config.mediaEdits=config.mediaEdits || {};config.mediaEdits[path]={output:result.url,source:result.sourceUrl};});
          }
        });
      } catch (error) { this.showActionToast({kind:'error',title:'เปิดตัวแก้ไขรูปไม่ได้',body:this.errorMessage(error)}); }
    }
  };
}
