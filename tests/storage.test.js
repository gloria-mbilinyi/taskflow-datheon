import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFromLocalStorage, saveToLocalStorage, STORAGE_KEY } from '../js/storage.js';
import { createTask } from '../js/tasks.js';

function memoryStorage(initial = null) {
  let raw = initial;
  return { getItem: () => raw, setItem: (key, value) => { assert.equal(key, STORAGE_KEY); raw = value; } };
}
test('loads an empty workspace without creating or deleting stored data', () => {
  const storage = memoryStorage();
  assert.deepEqual(loadFromLocalStorage(storage), { tasks: [], raw: null, writable: true, error: null });
  assert.equal(storage.getItem(), null);
});
test('saves and reloads tasks in order including IDs and timestamps', () => {
  const tasks = [createTask({ title: 'First' }), createTask({ title: 'Second', completed: true })];
  const storage = memoryStorage();
  assert.ok(saveToLocalStorage(tasks, { storage, expectedRaw: null }).ok);
  assert.deepEqual(loadFromLocalStorage(storage).tasks, tasks);
});
test('preserves corrupted JSON and prevents automatic overwrites', () => {
  const raw = '{broken'; const storage = memoryStorage(raw);
  const result = loadFromLocalStorage(storage);
  assert.equal(result.writable, false);
  assert.equal(result.raw, raw);
  assert.equal(saveToLocalStorage([], { storage, expectedRaw: raw, blocked: true }).ok, false);
  assert.equal(storage.getItem(), raw);
});
test('recovers valid records but protects partial, invalid-date and duplicate data', () => {
  const task = createTask({ title: 'Keep me' });
  const raw = JSON.stringify({ version: 1, tasks: [task, { ...task, id: 'bad-date', dueDate: '2026-02-30' }, task, {}] });
  const storage = memoryStorage(raw); const result = loadFromLocalStorage(storage);
  assert.deepEqual(result.tasks, [task]);
  assert.equal(result.writable, false);
  assert.equal(storage.getItem(), raw);
});
test('handles unsupported versions without overwriting them', () => {
  const raw = '{"version":99,"tasks":[]}'; const storage = memoryStorage(raw);
  assert.equal(loadFromLocalStorage(storage).writable, false);
  assert.equal(storage.getItem(), raw);
});
test('handles read failures and quota/write errors gracefully', () => {
  const denied = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(loadFromLocalStorage(denied).writable, false);
  assert.equal(saveToLocalStorage([], { storage: denied }).ok, false);
  const quota = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(saveToLocalStorage([], { storage: quota, expectedRaw: null }).ok, false);
});
test('detects another tab’s changes before overwriting its valid data', () => {
  const storage = memoryStorage(); const before = loadFromLocalStorage(storage);
  saveToLocalStorage([createTask({ title: 'Other tab' })], { storage });
  const remoteRaw = storage.getItem();
  assert.equal(saveToLocalStorage([], { storage, expectedRaw: before.raw }).ok, false);
  assert.equal(storage.getItem(), remoteRaw);
});
