import { dueInfo, plural } from './utils.js';

export function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.append(use);
  return svg;
}

export function announce(message) {
  const region = document.getElementById('announcements');
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}

export function toast(message, error = false) {
  const region = document.getElementById('toast-region');
  const item = element('div', `toast${error ? ' error' : ''}`);
  const dismiss = element('button', 'icon-button');
  dismiss.type = 'button'; dismiss.setAttribute('aria-label', 'Dismiss notification');
  dismiss.append(icon('close')); dismiss.addEventListener('click', () => item.remove());
  item.append(icon(error ? 'alert' : 'check-circle'), element('span', '', message), dismiss);
  region.append(item);
  while (region.children.length > 3) region.firstElementChild.remove();
  // Critical storage notices also remain in the persistent workspace banner.
  setTimeout(() => item.remove(), error ? 10000 : 6000);
}

export function showStorageWarning(message) {
  document.getElementById('storage-warning').hidden = !message;
  document.getElementById('storage-message').textContent = message || '';
  document.getElementById('save-status').textContent = message ? 'Changes kept in this tab only' : 'Saved on this device';
}

export function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  list.replaceChildren();
  for (const task of tasks) {
    const item = element('li', 'task-card');
    item.dataset.taskId = task.id;
    const content = element('div', 'task-content');
    content.append(element('h3', 'task-title', task.title));
    if (task.description) content.append(element('p', 'task-description', task.description));
    content.append(element('div', 'task-metadata', `${task.category} · ${dueInfo(task.dueDate, task.completed).label} · ${task.completed ? 'Completed' : 'Active'}`));
    item.append(content); list.append(item);
  }
  document.getElementById('empty-state').hidden = tasks.length > 0;
  document.getElementById('visible-count').textContent = tasks.length;
}

export function renderBasicCounts(tasks) {
  const completed = tasks.filter(task => task.completed).length;
  const values = { total: tasks.length, active: tasks.length - completed, completed, overdue: tasks.filter(task => dueInfo(task.dueDate, task.completed).kind === 'overdue').length };
  for (const [key, count] of Object.entries(values)) {
    document.getElementById(`stat-${key}`).textContent = count;
    const nav = document.getElementById(`nav-${key}`);
    if (nav) nav.textContent = count;
  }
  for (const category of ['Work', 'Personal', 'Study']) document.getElementById(`count-${category.toLowerCase()}`).textContent = tasks.filter(task => task.category === category).length;
  document.getElementById('task-summary').textContent = `${plural(tasks.length)} in your workspace`;
}
