import React from 'react';

export default function WorkItem({ item, level = 0 }) {
  const colors = {
    task: 'bg-yellow-100',
    'user story': 'bg-blue-100',
    bug: 'bg-red-100',
    feature: 'bg-purple-100',
  };

  const colorClass = colors[item.type?.toLowerCase()] || 'bg-gray-100';

  return (
    <div
      className={`p-1 mb-1 border ${colorClass}`}
      style={{ marginLeft: `${level * 1}rem` }}
    >
      <span className="font-mono text-xs mr-1">{item.id}</span>
      {item.title}
    </div>
  );
}
