// One logical enquiry survives transport errors, locale changes and panel swaps.
export class ContactSubmission {
  constructor({ prepare, send, onChange, slowMs = 8000, waitMs = 30000, now = Date.now, schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id) }) {
    Object.assign(this, { prepare, send, onChange, slowMs, waitMs, now, schedule, cancel });
    this.state = { kind: 'editing', fields: {}, reference: '' };
    this.active = null;
    this.busy = false;
    this.timers = new Set();
  }
  update(state) {
    this.state = { ...this.state, ...state };
    this.onChange(this.state);
  }
  async submit(input) {
    if (this.busy || !['editing', 'invalid'].includes(this.state.kind)) return;
    this.active = { input: JSON.parse(JSON.stringify(input)), request: null };
    return this.attempt(this.active);
  }
  async attempt(job) {
    if (this.busy) return;
    this.busy = true;
    this.update({ kind: 'submitting', fields: {}, reference: '', retryAt: null, viewing: false });
    const slow = this.schedule(() => { if (this.active === job && this.busy) this.update({ kind: 'submitting_slow' }); }, this.slowMs);
    const deadline = this.schedule(() => { if (this.active === job && this.busy) this.update({ kind: 'unknown' }); }, this.waitMs);
    this.timers.add(slow); this.timers.add(deadline);
    try {
      job.request ||= await this.prepare(job.input);
      if (this.active !== job) return;
      // A late module/payload preparation must not start a POST after the wait budget.
      if (this.state.kind === 'unknown') { this.update({ kind: 'failure' }); return; }
      const receipt = await this.send(job.request);
      if (this.active !== job) return;
      if (receipt.accepted !== true || typeof receipt.reference !== 'string' || !receipt.reference.trim()) throw Object.assign(new Error('Unconfirmed receipt'), { outcome: 'unknown' });
      this.active = null;
      job.input = null;
      job.request = null;
      this.update({ kind: 'success', reference: receipt.reference, fields: {}, viewing: false });
    } catch (error) {
      if (this.active !== job || this.state.kind === 'success') return;
      // Once the wait budget expires, only a verified receipt can resolve it.
      const kind = this.state.kind === 'unknown' ? 'unknown' : error.outcome || (job.request ? 'unknown' : 'failure');
      this.update({ kind, fields: error.fields || {}, retryAt: error.retryAt || null });
    } finally {
      this.cancel(slow); this.cancel(deadline);
      this.timers.delete(slow); this.timers.delete(deadline);
      if (this.active === job || this.state.kind === 'success') this.busy = false;
    }
  }
  retry() {
    if (!this.active || this.busy || !['failure', 'rate_limited'].includes(this.state.kind)) return;
    if (this.state.kind === 'rate_limited' && (!this.state.retryAt || this.now() < this.state.retryAt)) return;
    return this.attempt(this.active);
  }
  edit() {
    if (this.busy || !['failure', 'rate_limited', 'invalid'].includes(this.state.kind)) return;
    const message = this.state.kind === 'failure' ? 'failureBody' : this.state.kind === 'rate_limited' ? 'limitedBody' : '';
    this.active = null;
    this.update({ kind: 'editing', fields: message ? { form: message } : {}, viewing: false });
  }
  startNew() {
    if (this.state.kind !== 'success') return;
    this.active = null;
    this.update({ kind: 'editing', reference: '', fields: {}, viewing: false });
  }
  viewDraft() {
    if (this.state.kind === 'unknown') this.update({ viewing: !this.state.viewing });
  }
  dispose() { this.active = null; this.onChange = () => {}; this.timers.forEach(id => this.cancel(id)); this.timers.clear(); }
}

export function contactFieldErrors(input) {
  const fields = {};
  if (!String(input.name || '').trim()) fields.name = 'nameRequired';
  if (!String(input.contact || '').trim()) fields.contact = 'contactRequired';
  if (String(input.topic || '').length > 500) fields.topic = 'topicTooLong';
  if (input.consent !== true) fields.consent = 'consentRequired';
  return fields;
}
