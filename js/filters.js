function searchText(value) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}

export function filterTasks(tasks, { status = 'all', category = 'all', query = '' } = {}) {
  const needle = searchText(query);
  return tasks.filter(task => {
    const matchesStatus = status === 'all' || (status === 'completed' ? task.completed : !task.completed);
    const matchesSearch = !needle || searchText(`${task.title} ${task.description} ${task.category}`).includes(needle);
    return matchesStatus && (category === 'all' || task.category === category) && matchesSearch;
  });
}
