import React from 'react';

export default function WorkItem({ item, level = 0 }) {
  const colors = {
    task: 'bg-yellow-100 dark:bg-yellow-700',
    'user story': 'bg-blue-100 dark:bg-blue-700',
    bug: 'bg-red-100 dark:bg-red-700',
    feature: 'bg-purple-100 dark:bg-purple-700',
  };

  const colorClass = colors[item.type?.toLowerCase()] || 'bg-gray-100 dark:bg-gray-700';
  const isFeature = item.type?.toLowerCase() === 'feature';

  const dragStart = (e) => {
    e.dataTransfer.setData(
      'application/x-work-item',
      JSON.stringify(item)
    );
  };

  return isFeature ? (
    <div
      className="inline-block rounded-full px-2 py-1 bg-purple-200 dark:bg-purple-700 text-xs font-semibold mr-2 mb-2"
      draggable
      onDragStart={dragStart}
    >
      {item.title}
    </div>
  ) : (
    <div
      draggable
      onDragStart={dragStart}
      className={`p-1 mb-1 border ${colorClass} text-xs truncate`}
      style={{ marginLeft: `${level * 1}rem` }}
    >
      <span className="font-mono mr-1">{item.id}</span>
      {item.title}
    </div>
  );
}
