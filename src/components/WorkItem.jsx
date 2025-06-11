import React from 'react';

export default function WorkItem({
  item,
  level = 0,
  notes = [],
  onNoteDrop,
  highlight = false,
  pill = false,
}) {
  const colors = {
    task: 'bg-yellow-100 dark:bg-yellow-700',
    'user story': 'bg-blue-100 dark:bg-blue-700',
    bug: 'bg-red-100 dark:bg-red-700',
    feature: 'bg-purple-100 dark:bg-purple-700',
    // color for transversal activities
    'transversal activity': 'bg-green-100 dark:bg-green-700',
  };

  const icons = {
    task: '🛠',
    'user story': '📝',
    bug: '🐞',
    feature: '📂',
    // icon for transversal activities
    'transversal activity': '🔧',
  };

  const colorClass = colors[item.type?.toLowerCase()] || 'bg-gray-100 dark:bg-gray-700';
  const isFeature = item.type?.toLowerCase() === 'feature';
  const isTask = item.type?.toLowerCase() === 'task';

  const dragStart = (e) => {
    e.dataTransfer.setData(
      'application/x-work-item',
      JSON.stringify(item)
    );
  };

  const allowDrop = (e) => {
    if (e.dataTransfer.types.includes('application/x-note')) {
      e.preventDefault();
    }
  };

  const handleDrop = (e) => {
    const raw = e.dataTransfer.getData('application/x-note');
    if (!raw) return;
    e.preventDefault();
    const note = JSON.parse(raw);
    onNoteDrop && onNoteDrop(item.id, note);
  };

  const highlightClass = highlight ? 'ring-2 ring-red-500' : '';
  const asPill = pill;

  return asPill ? (
    <div
      className={`inline-block task-pill px-2 py-1 ${colorClass} text-xs font-semibold mr-2 mb-2 ${highlightClass}`}
      draggable
      onDragStart={dragStart}
      onDragOver={allowDrop}
      onDrop={handleDrop}
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
      className={`p-1 mb-1 border ${colorClass} text-xs truncate ${highlightClass}`}
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
