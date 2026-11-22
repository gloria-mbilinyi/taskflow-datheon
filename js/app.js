import { createTask, updateTask, deleteTask, toggleTask, clearCompletedTasks, ValidationError } from './tasks.js';
import { loadFromLocalStorage, saveToLocalStorage } from './storage.js';
import { filterTasks } from './filters.js';
import { renderTasks, renderBasicCounts, toast, showStorageWarning, announce, confirmAction } from './ui.js';

const storageState = loadFromLocalStorage();
let tasks = storageState.tasks;
let dirty = false;
const dialog = document.getElementById('task-dialog');
const form = document.getElementById('task-form');
const quickForm = document.getElementById('quick-add');
let dialogOpener;
const filters = { status: 'all', category: 'all', query: '' };
const isFiltered = () => filters.status !== 'all' || filters.category !== 'all' || !!filters.query.trim();
const visibleTasks = () => filterTasks(tasks, filters);

function render() {
  renderTasks(visibleTasks(), { total: tasks.length, filtered: isFiltered() });
  renderBasicCounts(tasks);
  for (const button of document.querySelectorAll('[data-status]')) {
    const selected = button.dataset.status === filters.status;
    button.classList.toggle('is-selected', selected); button.setAttribute('aria-pressed', selected);
  }
  for (const button of document.querySelectorAll('[data-category]')) {
    const selected = button.dataset.category === filters.category;
    button.classList.toggle('is-selected', selected); button.setAttribute('aria-pressed', selected);
  }
  document.getElementById('category-filter').value = filters.category;
}

function resetFilters() {
  Object.assign(filters, { status: 'all', category: 'all', query: '' });
  document.getElementById('search').value = '';
  render(); announce('All tasks shown. Filters cleared.');
}

for (const button of document.querySelectorAll('[data-status]')) {
  button.disabled = false;
  button.addEventListener('click', () => { filters.status = button.dataset.status; render(); announce(`${visibleTasks().length} tasks in this view.`); });
}
for (const button of document.querySelectorAll('[data-category]')) {
  button.disabled = false;
  button.addEventListener('click', () => { filters.category = filters.category === button.dataset.category ? 'all' : button.dataset.category; render(); announce(`${visibleTasks().length} tasks in this view.`); });
}
const categoryFilter = document.getElementById('category-filter');
categoryFilter.disabled = false;
categoryFilter.addEventListener('change', () => { filters.category = categoryFilter.value; render(); announce(`${visibleTasks().length} tasks in this view.`); });
const search = document.getElementById('search');
search.disabled = false;
let searchAnnouncement;
search.addEventListener('input', () => {
  filters.query = search.value; render();
  clearTimeout(searchAnnouncement);
  searchAnnouncement = setTimeout(() => announce(`${visibleTasks().length} tasks match your search and filters.`), 250);
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.matches('input, textarea, select, [contenteditable="true"]') && !document.querySelector('dialog[open]')) {
    event.preventDefault(); search.focus();
  }
});

function commitTasks(nextTasks, message) {
  const newlyCompleted = nextTasks.filter(task => task.completed && tasks.some(previous => previous.id === task.id && !previous.completed)).map(task => task.id);
  tasks = nextTasks;
  const result = saveToLocalStorage(tasks, { expectedRaw: storageState.raw, blocked: !storageState.writable });
  dirty = !result.ok;
  if (result.ok) { storageState.raw = result.raw; storageState.error = null; }
  else { storageState.writable = false; storageState.error = result.error; }
  showStorageWarning(storageState.error);
  render();
  for (const row of document.querySelectorAll('.task-card')) if (newlyCompleted.includes(row.dataset.taskId)) row.classList.add('just-completed');
  toast(result.ok ? message : `${message} Changes are in this tab only.`, !result.ok);
  announce(result.ok ? message : `${message} Not saved to this device.`);
  return result.ok;
}

function clearFormErrors() {
  for (const input of form.querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
  for (const error of form.querySelectorAll('.field-error')) error.textContent = '';
}

function openTaskDialog(opener, task = null) {
  dialogOpener = opener || document.activeElement;
  form.reset(); clearFormErrors();
  form.elements.taskId.value = task?.id || '';
  document.getElementById('dialog-title').textContent = task ? 'Edit your task' : 'Create a task';
  document.getElementById('save-task').textContent = task ? 'Save changes' : 'Create task';
  document.getElementById('completed-field').hidden = !task;
  if (task) {
    for (const field of ['title', 'description', 'category', 'dueDate']) form.elements[field].value = task[field];
    form.elements.completed.checked = task.completed;
  }
  dialog.showModal();
  form.elements.title.focus();
}

for (const button of document.querySelectorAll('[data-new-task]')) {
  button.disabled = false;
  button.addEventListener('click', () => { if (button.id === 'empty-action' && isFiltered()) resetFilters(); else openTaskDialog(button); });
}
for (const button of document.querySelectorAll('[data-close-dialog]')) button.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (dialogOpener?.isConnected) dialogOpener.focus();
  else {
    const row = [...document.querySelectorAll('.task-card')].find(item => item.dataset.taskId === form.elements.taskId.value);
    (row?.querySelector('[data-action="edit"]') || document.getElementById('quick-title')).focus();
  }
});

document.getElementById('task-list').addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  const row = button?.closest('[data-task-id]');
  if (!row) return;
  const task = tasks.find(task => task.id === row.dataset.taskId);
  if (task && button.dataset.action === 'edit') openTaskDialog(button, task);
  if (task && button.dataset.action === 'trash') {
    const confirmed = await confirmAction({ title: 'Let this task go?', description: `“${task.title}” will be permanently deleted from this workspace. This cannot be undone.` });
    if (!confirmed) return;
    const index = [...document.querySelectorAll('.task-card')].findIndex(item => item.dataset.taskId === task.id);
    commitTasks(deleteTask(tasks, task.id), 'Task deleted. A little more room to focus.');
    const rows = document.querySelectorAll('.task-card');
    (rows[Math.min(index, rows.length - 1)]?.querySelector('[data-action="edit"]') || document.getElementById('quick-title')).focus();
  }
});

document.getElementById('task-list').addEventListener('change', event => {
  if (!event.target.matches('.task-check')) return;
  const id = event.target.closest('[data-task-id]').dataset.taskId;
  const task = tasks.find(task => task.id === id);
  if (!task) return;
  commitTasks(toggleTask(tasks, id), task.completed ? 'Task reopened. Ready when you are.' : 'Task completed. That’s a win!');
  const row = [...document.querySelectorAll('.task-card')].find(item => item.dataset.taskId === id);
  (row?.querySelector('.task-check') || document.getElementById('quick-title')).focus();
});

document.getElementById('clear-completed').addEventListener('click', async () => {
  const count = tasks.filter(task => task.completed).length;
  if (!count) return;
  const confirmed = await confirmAction({ title: 'Make room for what’s next?', description: `All ${count} completed ${count === 1 ? 'task' : 'tasks'} will be permanently deleted, including any outside your current filters. This cannot be undone.`, accept: 'Clear completed', cancel: 'Keep completed' });
  if (confirmed) { commitTasks(clearCompletedTasks(tasks), 'Completed tasks cleared. Fresh space, fresh focus.'); document.getElementById('quick-title').focus(); }
});

form.addEventListener('submit', event => {
  event.preventDefault(); clearFormErrors();
  try {
    if (form.elements.dueDate.validity.badInput) throw new ValidationError({ dueDate: 'Choose a valid date, or leave it empty.' });
    const input = Object.fromEntries(new FormData(form));
    if (input.taskId) {
      commitTasks(updateTask(tasks, input.taskId, { ...input, completed: form.elements.completed.checked }), 'Task updated. Your plan, refined.');
    } else {
      const task = createTask({ ...input, completed: false });
      commitTasks([...tasks, task], 'Task created. You’ve got this.');
    }
    dialog.close();
  } catch (error) {
    if (!(error instanceof ValidationError)) { toast('This task could not be saved. Please try again.', true); return; }
    for (const [field, message] of Object.entries(error.errors)) {
      const errorId = field === 'title' ? 'title-error' : 'date-error';
      document.getElementById(errorId).textContent = message;
      form.elements[field]?.setAttribute('aria-invalid', 'true');
    }
    form.elements[Object.keys(error.errors)[0]]?.focus();
  }
});

for (const control of quickForm.elements) control.disabled = false;
quickForm.addEventListener('submit', event => {
  event.preventDefault();
  const errorNode = document.getElementById('quick-error');
  errorNode.textContent = '';
  quickForm.elements.title.removeAttribute('aria-invalid');
  try {
    if (quickForm.elements.dueDate.validity.badInput) throw new ValidationError({ dueDate: 'Choose a valid date, or leave it empty.' });
    const task = createTask(Object.fromEntries(new FormData(quickForm)));
    commitTasks([...tasks, task], 'Task added. One step closer.');
    quickForm.elements.title.value = '';
    quickForm.elements.title.focus();
  } catch (error) {
    errorNode.textContent = error instanceof ValidationError ? error.message : 'This task could not be added. Please try again.';
    const field = error.errors?.dueDate ? quickForm.elements.dueDate : quickForm.elements.title;
    field.setAttribute('aria-invalid', 'true'); field.focus();
  }
});

showStorageWarning(storageState.error);
render();
