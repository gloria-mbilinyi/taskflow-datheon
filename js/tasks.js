import { isValidDate } from './utils.js';

export const CATEGORIES = Object.freeze(['Work', 'Personal', 'Study']);
export class ValidationError extends Error {
  constructor(errors) {
    super(Object.values(errors)[0]);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export function normalizeTaskInput(input = {}) {
  const errors = {};
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = input.description === undefined ? '' : typeof input.description === 'string' ? input.description.trim() : null;
  const category = input.category === undefined ? 'Work' : input.category;
  const dueDate = input.dueDate === undefined ? '' : typeof input.dueDate === 'string' ? input.dueDate.trim() : null;
  const completed = input.completed === undefined ? false : input.completed;
  if (!title) errors.title = 'Give your task a title so you know where to start.';
  else if (title.length > 160) errors.title = 'Keep the title to 160 characters or fewer.';
  if (description === null || description.length > 2000) errors.description = 'Keep the description to 2,000 characters or fewer.';
  if (!CATEGORIES.includes(category)) errors.category = 'Choose Work, Personal, or Study.';
  if (dueDate === null || (dueDate && !isValidDate(dueDate))) errors.dueDate = 'Choose a valid date, or leave it empty.';
  if (typeof completed !== 'boolean') errors.completed = 'Completion must be active or completed.';
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return { title, description, category, dueDate, completed };
}

export function createTask(input, now = new Date()) {
  const normalized = normalizeTaskInput(input);
  const timestamp = now.toISOString();
  return { id: crypto.randomUUID(), ...normalized, createdAt: timestamp, updatedAt: timestamp };
}

export function isStoredTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return false;
  if (typeof task.id !== 'string' || !task.id || task.id.length > 128) return false;
  if (typeof task.description !== 'string' || typeof task.dueDate !== 'string' || typeof task.completed !== 'boolean' || !CATEGORIES.includes(task.category)) return false;
  for (const field of ['createdAt', 'updatedAt']) {
    if (typeof task[field] !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(task[field]) || !Number.isFinite(Date.parse(task[field]))) return false;
  }
  try { normalizeTaskInput(task); return true; } catch { return false; }
}

export function updateTask(tasks, id, changes, now = new Date()) {
  const current = tasks.find(task => task.id === id);
  if (!current) throw new Error('This task no longer exists.');
  const normalized = normalizeTaskInput({ ...current, ...changes });
  const updated = { ...current, ...normalized, updatedAt: now.toISOString() };
  return tasks.map(task => task.id === id ? updated : task);
}
