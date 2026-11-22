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

export function actionButton(action, name, taskTitle, extraClass = '') {
  const button = element('button', `icon-button ${extraClass}`.trim());
  button.type = 'button'; button.dataset.action = action;
  const label = `${name}: ${taskTitle}`;
  button.setAttribute('aria-label', label); button.title = label;
  button.append(icon(action));
  return button;
}

export function confirmAction({ title, description, accept = 'Delete task', cancel = 'Keep task', destructive = true }) {
  const dialog = document.getElementById('confirm-dialog');
  if (dialog.open) return Promise.resolve(false);
  const opener = document.activeElement;
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-description').textContent = description;
  const acceptButton = document.getElementById('confirm-accept');
  const cancelButton = document.getElementById('confirm-cancel');
  acceptButton.textContent = accept;
  acceptButton.className = `button ${destructive ? 'danger' : 'primary'}`;
  cancelButton.textContent = cancel;
  dialog.returnValue = 'cancel';
  acceptButton.onclick = () => dialog.close('confirm');
  cancelButton.onclick = () => dialog.close('cancel');
  return new Promise(resolve => {
    dialog.addEventListener('close', () => {
      if (opener?.isConnected) opener.focus();
      resolve(dialog.returnValue === 'confirm');
    }, { once: true });
    dialog.showModal();
    cancelButton.focus();
  });
}

export function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  list.replaceChildren();
  for (const task of tasks) {
    const item = element('li', `task-card${task.completed ? ' is-completed' : ''}`);
    item.dataset.taskId = task.id;
    const marker = element('span', 'task-marker');
    marker.setAttribute('aria-hidden', 'true');
    marker.append(icon(task.completed ? 'check-circle' : 'circle'));
    const content = element('div', 'task-content');
    content.append(element('h3', 'task-title', task.title));
    if (task.description) content.append(element('p', 'task-description', task.description));
    const metadata = element('div', 'task-metadata');
    const badge = element('span', `category-badge ${task.category.toLowerCase()}`);
    badge.append(icon({ Work: 'briefcase', Personal: 'person', Study: 'book' }[task.category]), document.createTextNode(task.category));
    const due = dueInfo(task.dueDate, task.completed);
    const date = element(task.dueDate ? 'time' : 'span', `due-label ${due.kind}`);
    if (task.dueDate) date.dateTime = task.dueDate;
    date.append(icon('calendar'), document.createTextNode(due.label));
    metadata.append(badge, date, element('span', 'task-state', task.completed ? 'Completed' : 'Active'));
    content.append(metadata);
    const actions = element('div', 'task-actions');
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', `Actions for ${task.title}`);
    actions.append(actionButton('edit', 'Edit task', task.title));
    actions.append(actionButton('trash', 'Delete task', task.title, 'delete-task'));
    item.append(marker, content, actions); list.append(item);
  }
  document.getElementById('empty-state').hidden = tasks.length > 0;
  document.getElementById('visible-count').textContent = tasks.length;
  document.getElementById('list-caption').textContent = tasks.length ? 'A little intention. A little action. A little closer.' : 'Your next chapter starts with one small task.';
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
