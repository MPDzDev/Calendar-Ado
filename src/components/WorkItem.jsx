import React from 'react';

export default function WorkItem({
  item,
  level = 0,
  notes = [],
  onNoteDrop,
  onItemDrop,
  highlight = false,
  pill = false,
  onOpen,
}) {
  const colors = {
    task: 'bg-yellow-100 dark:bg-yellow-700',
    'user story': 'bg-blue-100 dark:bg-blue-700',
    bug: 'bg-red-100 dark:bg-red-700',
    feature: 'bg-purple-100 dark:bg-purple-700',
    epic: 'bg-orange-100 dark:bg-orange-700',
    // color for transversal activities
    'transversal activity': 'bg-green-100 dark:bg-green-700',
  };

  const icons = {
    task: '🛠',
    'user story': '📝',
    bug: '🐞',
    feature: '📂',
    epic: '🚀',
    // icon for transversal activities
    'transversal activity': '🔧',
  };

  const type = item.type?.toLowerCase();
  const colorClass = colors[type] || 'bg-gray-100 dark:bg-gray-700';
  const isFeature = type === 'feature';
  const isEpic = type === 'epic';
  const isTask = type === 'task';

  let sizeClass = 'text-xs';
  if (isFeature) sizeClass = 'text-sm font-semibold';
  if (isEpic) sizeClass = 'text-lg font-bold';

  const dragStart = (e) => {
    e.dataTransfer.setData(
      'application/x-work-item',
      JSON.stringify(item)
    );
  };

  const allowDrop = (e) => {
    if (
      e.dataTransfer.types.includes('application/x-note') ||
      e.dataTransfer.types.includes('application/x-work-item')
    ) {
      e.preventDefault();
    }
  };

  const handleDrop = (e) => {
    const noteRaw = e.dataTransfer.getData('application/x-note');
    const itemRaw = e.dataTransfer.getData('application/x-work-item');
    if (noteRaw) {
      e.preventDefault();
      const note = JSON.parse(noteRaw);
      onNoteDrop && onNoteDrop(item.id, note);
    } else if (itemRaw) {
      e.preventDefault();
      const dragged = JSON.parse(itemRaw);
      onItemDrop && onItemDrop(item, dragged);
    }
  };

  const highlightClass = highlight ? 'ring-2 ring-red-500' : '';
  const asPill = pill;

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (onOpen) onOpen(item);
  };

  return asPill ? (
    <div
      className={`inline-block task-pill px-2 py-1 ${colorClass} text-xs font-semibold mr-2 mb-2 ${highlightClass}`}
      draggable
      onDragStart={dragStart}
      onDragOver={allowDrop}
      onDrop={handleDrop}
      onDoubleClick={handleDoubleClick}
      title={item.title}
      style={{ marginLeft: `${level * 0.5}rem` }}
    >
      <span className="mr-1">{icons[item.type?.toLowerCase()]}</span>
      {item.title}
      {notes.length > 0 && (
        <ul className="ml-2 list-disc text-[10px]">
          {notes.map((n, idx) => (
            <li key={idx}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  ) : (
    <div
      draggable
      onDragStart={dragStart}
      onDragOver={allowDrop}
      onDrop={handleDrop}
      onDoubleClick={handleDoubleClick}
      className={`p-1 mb-1 border ${colorClass} ${sizeClass} truncate ${highlightClass}`}
      style={{ marginLeft: `${level * 1}rem` }}
      title={item.title}
    >
      <span className="font-mono mr-1 text-gray-500 dark:text-gray-400">{item.id}</span>
      <span className="mr-1">{icons[item.type?.toLowerCase()]}</span>
      {item.title}
      {notes.length > 0 && (
        <ul className="ml-4 list-disc text-[10px]">
          {notes.map((n, idx) => (
            <li key={idx}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
