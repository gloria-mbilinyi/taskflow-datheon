import { dueInfo } from './utils.js';

export function getStatistics(tasks, now = new Date()) {
  const completed = tasks.filter(task => task.completed).length;
  return {
    total: tasks.length,
    active: tasks.length - completed,
    completed,
    overdue: tasks.filter(task => dueInfo(task.dueDate, task.completed, now).kind === 'overdue').length,
    percent: tasks.length ? Math.round(completed / tasks.length * 100) : 0,
  };
}

export function getUpcomingTasks(tasks, now = new Date(), limit = 3) {
  return tasks.filter(task => {
    const { days } = dueInfo(task.dueDate, task.completed, now);
    return !task.completed && days !== null && days >= 0 && days <= 7;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, limit);
}
