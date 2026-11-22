import { createTask, updateTask, ValidationError } from './tasks.js';
import { loadFromLocalStorage, saveToLocalStorage } from './storage.js';
import { renderTasks, renderBasicCounts, toast, showStorageWarning, announce } from './ui.js';

const storageState = loadFromLocalStorage();
let tasks = storageState.tasks;
let dirty = false;
const dialog = document.getElementById('task-dialog');
const form = document.getElementById('task-form');
const quickForm = document.getElementById('quick-add');
let dialogOpener;

function render() {
  renderTasks(tasks);
  renderBasicCounts(tasks);
}

function commitTasks(nextTasks, message) {
  tasks = nextTasks;
  const result = saveToLocalStorage(tasks, { expectedRaw: storageState.raw, blocked: !storageState.writable });
  dirty = !result.ok;
  if (result.ok) { storageState.raw = result.raw; storageState.error = null; }
  else { storageState.writable = false; storageState.error = result.error; }
  showStorageWarning(storageState.error);
  render();
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
  button.addEventListener('click', () => openTaskDialog(button));
}
for (const button of document.querySelectorAll('[data-close-dialog]')) button.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (dialogOpener?.isConnected) dialogOpener.focus();
  else {
    const row = [...document.querySelectorAll('.task-card')].find(item => item.dataset.taskId === form.elements.taskId.value);
    (row?.querySelector('[data-action="edit"]') || document.getElementById('quick-title')).focus();
  }
});

document.getElementById('task-list').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  const row = button?.closest('[data-task-id]');
  if (!row) return;
  const task = tasks.find(task => task.id === row.dataset.taskId);
  if (task && button.dataset.action === 'edit') openTaskDialog(button, task);
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
