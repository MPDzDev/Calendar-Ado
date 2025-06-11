export function summarizeByArea(blocks, items, dayDate) {
  const dateStr = dayDate.toDateString();
  const summary = {};
  for (const b of blocks) {
    const start = new Date(b.start);
    if (start.toDateString() !== dateStr) continue;
    const end = new Date(b.end);
    const hrs = (end - start) / (1000 * 60 * 60);
    const itemId = b.itemId || b.taskId;
    const item = items?.find((i) => i.id === itemId);
    const area = item?.area || 'Unassigned';
    summary[area] = (summary[area] || 0) + hrs;
  }
  return summary;
}
