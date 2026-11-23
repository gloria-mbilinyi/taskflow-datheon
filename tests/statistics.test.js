import test from 'node:test';
import assert from 'node:assert/strict';
import { getStatistics, getUpcomingTasks } from '../js/statistics.js';
import { createTask } from '../js/tasks.js';
const now = new Date(2026, 10, 23, 12);
test('reports consistent totals, overdue tasks and completion progress', () => {
  const tasks = [createTask({ title: 'Overdue', dueDate: '2026-11-22' }), createTask({ title: 'Done', dueDate: '2026-11-21', completed: true }), createTask({ title: 'Today', dueDate: '2026-11-23' })];
  assert.deepEqual(getStatistics(tasks, now), { total: 3, active: 2, completed: 1, overdue: 1, percent: 33 });
  assert.deepEqual(getStatistics([], now), { total: 0, active: 0, completed: 0, overdue: 0, percent: 0 });
});
test('upcoming tasks include today through seven days, sorted by date', () => {
  const tasks = [createTask({ title: 'Later', dueDate: '2026-11-30' }), createTask({ title: 'Today', dueDate: '2026-11-23' }), createTask({ title: 'Too far', dueDate: '2026-12-01' }), createTask({ title: 'Overdue', dueDate: '2026-11-22' }), createTask({ title: 'Completed', dueDate: '2026-11-24', completed: true }), createTask({ title: 'Undated' })];
  assert.deepEqual(getUpcomingTasks(tasks, now).map(task => task.title), ['Today', 'Later']);
  assert.equal(tasks[0].title, 'Later');
});
