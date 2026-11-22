import test from 'node:test';
import assert from 'node:assert/strict';
import { createTask, updateTask, deleteTask, normalizeTaskInput, isStoredTask, ValidationError } from '../js/tasks.js';
import { dueInfo, isValidDate, localDateKey } from '../js/utils.js';

test('creates a valid task with unique ID and both timestamps', () => {
  const now = new Date('2026-11-23T09:00:00Z');
  const task = createTask({ title: '  Plan the week  ', description: '  Focus  ', category: 'Study', dueDate: '2026-11-24' }, now);
  assert.equal(task.title, 'Plan the week');
  assert.equal(task.description, 'Focus');
  assert.equal(task.completed, false);
  assert.equal(task.createdAt, now.toISOString());
  assert.equal(task.updatedAt, task.createdAt);
  assert.notEqual(task.id, createTask({ title: 'Another task' }).id);
  assert.ok(isStoredTask(task));
});
test('rejects empty and non-string titles with a helpful field error', () => {
  for (const title of ['', '   ', null, 42, undefined]) {
    assert.throws(() => createTask({ title }), error => error instanceof ValidationError && !!error.errors.title);
  }
});
test('validates limits, categories, dates, and boolean status', () => {
  for (const input of [{ title: 'x'.repeat(161) }, { title: 'x', description: 'x'.repeat(2001) }, { title: 'x', category: 'Unknown' }, { title: 'x', dueDate: '2026-02-30' }, { title: 'x', completed: 'false' }]) assert.throws(() => normalizeTaskInput(input), ValidationError);
});
test('permits optional fields and preserves text without interpreting HTML', () => {
  const task = createTask({ title: '<img src=x onerror=alert(1)>' });
  assert.equal(task.title, '<img src=x onerror=alert(1)>');
  assert.equal(task.description, '');
  assert.equal(task.dueDate, '');
  assert.equal(task.category, 'Work');
});
test('validates leap dates and rejects rolled-over or malformed dates', () => {
  assert.ok(isValidDate('2024-02-29'));
  for (const value of ['2025-02-29', '2026-13-01', '2026-00-01', '2026-11-31', '2026-1-1', '0000-01-01', 'bad']) assert.equal(isValidDate(value), false);
});
test('due dates use local calendar days and completed tasks are never overdue', () => {
  const now = new Date(2026, 10, 23, 23, 59);
  assert.equal(localDateKey(now), '2026-11-23');
  assert.equal(dueInfo('2026-11-23', false, now).label, 'Today');
  assert.equal(dueInfo('2026-11-24', false, now).label, 'Tomorrow');
  assert.equal(dueInfo('2026-11-22', false, now).kind, 'overdue');
  assert.equal(dueInfo('2026-11-22', true, now).kind, 'done');
  assert.equal(dueInfo('bad', false, now).label, 'Invalid date');
});
test('rejects malformed stored records without accepting partial task shapes', () => {
  assert.equal(isStoredTask({ title: 'x' }), false);
  assert.equal(isStoredTask(null), false);
  assert.equal(isStoredTask({ ...createTask({ title: 'x' }), updatedAt: 'bad' }), false);
});
test('updates all editable fields without changing identity or original creation time', () => {
  const original = createTask({ title: 'Original' }, new Date('2026-11-20T09:00:00Z'));
  const updated = updateTask([original], original.id, { title: ' Revised ', description: 'Notes', category: 'Personal', dueDate: '2026-12-01', completed: true, id: 'untrusted', createdAt: 'untrusted' }, new Date('2026-11-23T09:00:00Z'))[0];
  assert.equal(updated.id, original.id);
  assert.equal(updated.createdAt, original.createdAt);
  assert.equal(updated.updatedAt, '2026-11-23T09:00:00.000Z');
  assert.equal(updated.title, 'Revised');
  assert.equal(updated.category, 'Personal');
  assert.equal(updated.completed, true);
  assert.equal(original.title, 'Original');
  assert.throws(() => updateTask([original], original.id, { title: '  ' }), ValidationError);
  assert.throws(() => updateTask([original], 'missing', { title: 'x' }));
});
test('deletes only the requested task without mutating other records', () => {
  const first = createTask({ title: 'First' }); const second = createTask({ title: 'Second' });
  const tasks = [first, second];
  assert.deepEqual(deleteTask(tasks, first.id), [second]);
  assert.deepEqual(tasks, [first, second]);
  assert.deepEqual(deleteTask(tasks, 'missing'), tasks);
});
