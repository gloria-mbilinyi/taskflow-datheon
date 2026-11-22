export function filterTasks(tasks, { status = 'all', category = 'all' } = {}) {
  return tasks.filter(task => {
    const matchesStatus = status === 'all' || (status === 'completed' ? task.completed : !task.completed);
    return matchesStatus && (category === 'all' || task.category === category);
  });
}
