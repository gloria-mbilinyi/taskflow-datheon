export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || year > 9999) return false;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateFromKey(value) {
  if (!isValidDate(value)) return null;
  const date = new Date(0);
  const [year, month, day] = value.split('-').map(Number);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function dueInfo(value, completed = false, now = new Date()) {
  const date = dateFromKey(value);
  if (!date) return { label: value ? 'Invalid date' : 'No due date', kind: 'none', days: null };
  const today = dateFromKey(localDateKey(now));
  // Compare calendar days in UTC to avoid daylight-saving changes.
  const serial = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((serial(date) - serial(today)) / 86400000);
  const formatted = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }).format(date);
  const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : formatted;
  return { label: !completed && days < 0 ? `Overdue · ${formatted}` : label, kind: completed ? 'done' : days < 0 ? 'overdue' : days <= 2 ? 'soon' : 'future', days };
}

export function plural(count, noun = 'task') {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
