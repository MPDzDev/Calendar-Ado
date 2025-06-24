export function summarizeByArea(blocks, items, dayDate) {
  const dateStr = dayDate.toDateString();
  const summary = {};
  for (const b of blocks) {
    const start = new Date(b.start);
    if (start.toDateString() !== dateStr) continue;
    const end = new Date(b.end);
    const hrs = (end - start) / (1000 * 60 * 60);
    const taskItem = b.taskId ? items?.find((i) => i.id === b.taskId) : null;
    const displayItem = b.itemId ? items?.find((i) => i.id === b.itemId) : null;
    const item = taskItem || displayItem;
    const area = item?.area || 'Unassigned';
    summary[area] = (summary[area] || 0) + hrs;
  }
  return summary;
}
