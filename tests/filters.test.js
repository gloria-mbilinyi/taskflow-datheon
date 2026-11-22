import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTasks } from '../js/filters.js';
import { createTask } from '../js/tasks.js';

const work = createTask({ title: 'Write project notes', category: 'Work' });
const personal = createTask({ title: 'Take a walk', category: 'Personal', completed: true });
const study = createTask({ title: 'Study JavaScript', category: 'Study' });
const tasks = [work, personal, study];
test('filters all, active, and completed tasks without mutating original order', () => {
  assert.deepEqual(filterTasks(tasks), tasks);
  assert.deepEqual(filterTasks(tasks, { status: 'active' }), [work, study]);
  assert.deepEqual(filterTasks(tasks, { status: 'completed' }), [personal]);
});
test('filters Work, Personal, and Study categories', () => {
  for (const task of tasks) assert.deepEqual(filterTasks(tasks, { category: task.category }), [task]);
});
test('combines status and category filters, including an empty result', () => {
  assert.deepEqual(filterTasks(tasks, { status: 'active', category: 'Study' }), [study]);
  assert.deepEqual(filterTasks(tasks, { status: 'completed', category: 'Work' }), []);
  assert.deepEqual(tasks, [work, personal, study]);
});
test('searches titles, descriptions, and categories instantly and case-insensitively', () => {
  assert.deepEqual(filterTasks(tasks, { query: ' JAVASCRIPT ' }), [study]);
  assert.deepEqual(filterTasks(tasks, { query: 'personal' }), [personal]);
  const note = createTask({ title: 'Shopping', description: 'Café supplies' });
  assert.deepEqual(filterTasks([note], { query: 'cafe' }), [note]);
  assert.deepEqual(filterTasks(tasks, { query: '  ' }), tasks);
  assert.deepEqual(filterTasks(tasks, { query: '[' }), []);
});
test('combines search with both status and category without changing task order', () => {
  assert.deepEqual(filterTasks(tasks, { status: 'active', category: 'Study', query: 'script' }), [study]);
  assert.deepEqual(filterTasks(tasks, { status: 'completed', category: 'Study', query: 'script' }), []);
});
