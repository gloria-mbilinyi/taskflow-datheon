import { isStoredTask } from './tasks.js';

export const STORAGE_KEY = 'taskflow.tasks.v1';
export const STORAGE_VERSION = 1;

export function loadFromLocalStorage(storage) {
  let raw = null;
  try {
    storage ??= globalThis.localStorage;
    raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { tasks: [], raw, writable: true, error: null };
    const data = JSON.parse(raw);
    if (!data || data.version !== STORAGE_VERSION || !Array.isArray(data.tasks)) {
      return { tasks: [], raw, writable: false, error: 'Saved data has an unsupported format. The original has been kept untouched. Download a backup before resetting it.' };
    }
    const seen = new Set();
    const tasks = data.tasks.filter(task => {
      if (!isStoredTask(task) || seen.has(task.id)) return false;
      seen.add(task.id); return true;
    });
    if (tasks.length !== data.tasks.length) {
      return { tasks, raw, writable: false, error: 'Some saved tasks could not be read. Readable tasks are shown; the original data is protected. Changes stay in this tab until you download a backup and reset saved data.' };
    }
    return { tasks, raw, writable: true, error: null };
  } catch {
    return { tasks: [], raw, writable: false, error: raw === null ? 'Browser storage is unavailable. Tasks will stay in this tab only. Download a backup before leaving.' : 'Saved data could not be read. The original is protected. Changes stay in this tab only; download a backup before resetting saved data.' };
  }
}

export function saveToLocalStorage(tasks, { storage, expectedRaw, blocked = false } = {}) {
  try {
    if (blocked) throw new Error('protected');
    storage ??= globalThis.localStorage;
    if (!Array.isArray(tasks) || !tasks.every(isStoredTask) || new Set(tasks.map(task => task.id)).size !== tasks.length) throw new Error('invalid');
    if (expectedRaw !== undefined && storage.getItem(STORAGE_KEY) !== expectedRaw) {
      return { ok: false, raw: expectedRaw, error: 'Saved tasks changed in another tab. This tab’s changes are kept here. Download a backup, then reload to see the latest saved workspace.' };
    }
    const raw = JSON.stringify({ version: STORAGE_VERSION, tasks });
    storage.setItem(STORAGE_KEY, raw);
    return { ok: true, raw, error: null };
  } catch {
    return { ok: false, raw: expectedRaw, error: blocked ? 'The original saved data is protected. Changes are kept in this tab only. Download a backup before resetting saved data.' : 'Your browser could not save these changes. They are kept in this tab only. Download a backup before leaving.' };
  }
}
