/**
 * Local CMS undo history. Only editable content belongs in a snapshot; auth,
 * language, publishing state and other runtime state stay with the caller.
 * serialize() returns a session-storage string, or null when one draft alone
 * exceeds the budget. An oversized draft is retained as the current state only.
 */
export function createEditorHistory(initialSnapshot = { config: {}, text: {} }, options = {}) {
  const VERSION = 1;
  const MAX_STATES = 30;
  const MAX_BYTES = 2 * 1024 * 1024;
  const maxStates = Number.isInteger(options.maxStates) && options.maxStates > 0
    ? Math.min(options.maxStates, MAX_STATES) : MAX_STATES;
  const maxBytes = Number.isInteger(options.maxBytes) && options.maxBytes > 0
    ? Math.min(options.maxBytes, MAX_BYTES) : MAX_BYTES;
  const groupWindowMs = 1000;
  let entries = [];
  let cursor = 0;
  let group = null;

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  // Reject unsupported values rather than silently dropping content in a clone.
  function cloneJSON(value) {
    const ancestors = new Set();
    function validate(item) {
      if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
      if (typeof item === 'number' && Number.isFinite(item)) return;
      if (!item || typeof item !== 'object' || ancestors.has(item)) {
        throw new TypeError('Editor history requires finite, acyclic JSON values.');
      }
      const prototype = Object.getPrototypeOf(item);
      // Accept plain objects from another JS realm (e.g. an embedded editor),
      // but reject instances whose prototype chain adds a custom class.
      if (!Array.isArray(item) && prototype !== null && Object.getPrototypeOf(prototype) !== null) {
        throw new TypeError('Editor history requires plain JSON objects.');
      }
      ancestors.add(item);
      for (const key of Object.keys(item)) validate(item[key]);
      if (Array.isArray(item) && Object.keys(item).length !== item.length) {
        throw new TypeError('Editor history does not support sparse arrays.');
      }
      ancestors.delete(item);
    }
    validate(value);
    return JSON.parse(JSON.stringify(value));
  }

  function snapshotOf(value) {
    if (!isRecord(value) || !isRecord(value.config) || !isRecord(value.text)) {
      throw new TypeError('Editor history needs a { config, text } snapshot.');
    }
    return cloneJSON({ config: value.config, text: value.text });
  }

  // Object key order is not a content change; array order always is.
  function fingerprint(value) {
    if (Array.isArray(value)) return '[' + value.map(fingerprint).join(',') + ']';
    if (isRecord(value)) {
      return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + fingerprint(value[key])).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  function utf8Bytes(value) {
    let bytes = 0;
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length
        && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) {
        bytes += 4;
        i += 1;
      } else bytes += 3;
    }
    return bytes;
  }

  function entryPayload(entry) {
    return { snapshot: entry.snapshot, view: entry.view, label: entry.label };
  }

  function makeEntry(snapshot, view, label) {
    const entry = {
      snapshot: snapshotOf(snapshot),
      view: view == null ? null : cloneJSON(view),
      label: typeof label === 'string' ? label.slice(0, 200) : 'แก้ไขเนื้อหา'
    };
    entry.fingerprint = fingerprint(entry.snapshot);
    entry.bytes = utf8Bytes(JSON.stringify(entryPayload(entry)));
    return entry;
  }

  function serializedSize() {
    return utf8Bytes(JSON.stringify({ version: VERSION, cursor, entries: [] }))
      + entries.reduce((total, entry) => total + entry.bytes, 0)
      + Math.max(0, entries.length - 1);
  }

  function trim() {
    // Keep the current draft. Remove the oldest past first; when the cursor is
    // at the beginning, remove the furthest future instead of moving it.
    while (entries.length > 1 && (entries.length > maxStates || serializedSize() > maxBytes)) {
      if (cursor > 0) {
        entries.shift();
        cursor -= 1;
      } else entries.pop();
    }
  }

  function describe() {
    const canUndo = cursor > 0;
    const canRedo = cursor < entries.length - 1;
    return {
      canUndo,
      canRedo,
      undoLabel: canUndo ? entries[cursor].label : '',
      redoLabel: canRedo ? entries[cursor + 1].label : '',
      entries: entries.length,
      cursor
    };
  }

  function breakGroup() {
    group = null;
  }

  function reset(snapshot) {
    entries = [makeEntry(snapshot, null, '')];
    cursor = 0;
    breakGroup();
    return describe();
  }

  function record(snapshot, { groupKey = '', label = 'แก้ไขเนื้อหา', now = Date.now(), view = null } = {}) {
    const next = makeEntry(snapshot, view, label);
    // A repeated save/render is not an edit and must preserve a redo branch.
    if (entries[cursor].fingerprint === next.fingerprint) return describe();
    const timestamp = Number.isFinite(now) ? now : Date.now();
    const key = typeof groupKey === 'string' ? groupKey : '';
    const coalesce = key && group && key === group.key && cursor === entries.length - 1
      && cursor > 0 && timestamp >= group.at && timestamp - group.at <= groupWindowMs;
    if (coalesce) {
      entries[cursor] = next;
      // Typing back to the pre-group value should not create an empty undo.
      if (entries[cursor - 1].fingerprint === next.fingerprint) {
        entries.pop();
        cursor -= 1;
        breakGroup();
        return describe();
      }
    } else {
      entries = entries.slice(0, cursor + 1);
      entries.push(next);
      cursor += 1;
    }
    group = key ? { key, at: timestamp } : null;
    trim();
    return describe();
  }

  function resultAtCurrent(label) {
    const entry = entries[cursor];
    return { snapshot: snapshotOf(entry.snapshot), view: cloneJSON(entry.view), label };
  }

  function undo() {
    if (cursor === 0) return null;
    const label = entries[cursor].label;
    cursor -= 1;
    breakGroup();
    return resultAtCurrent(label);
  }

  function redo() {
    if (cursor >= entries.length - 1) return null;
    cursor += 1;
    breakGroup();
    return resultAtCurrent(entries[cursor].label);
  }

  function serialize() {
    if (serializedSize() > maxBytes) return null;
    return JSON.stringify({ version: VERSION, cursor, entries: entries.map(entryPayload) });
  }

  function restore(payload, currentSnapshot) {
    try {
      const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (!raw || utf8Bytes(raw) > MAX_BYTES) return false;
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed) || parsed.version !== VERSION || !Array.isArray(parsed.entries)
        || parsed.entries.length < 1 || parsed.entries.length > MAX_STATES
        || !Number.isInteger(parsed.cursor) || parsed.cursor < 0 || parsed.cursor >= parsed.entries.length) return false;
      const restored = parsed.entries.map(entry => {
        if (!isRecord(entry) || typeof entry.label !== 'string' || entry.label.length > 200
          || !Object.prototype.hasOwnProperty.call(entry, 'view') || !isRecord(entry.snapshot)
          || Object.keys(entry.snapshot).length !== 2) throw new TypeError('Invalid history entry.');
        return makeEntry(entry.snapshot, entry.view, entry.label);
      });
      const current = snapshotOf(currentSnapshot);
      if (restored[parsed.cursor].fingerprint !== fingerprint(current)) return false;
      entries = restored;
      cursor = parsed.cursor;
      breakGroup();
      trim();
      return true;
    } catch (_) {
      return false;
    }
  }

  reset(initialSnapshot);
  return { reset, record, undo, redo, breakGroup, describe, serialize, restore };
}
