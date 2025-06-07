import React from 'react';

export default function ItemBubble({ item }) {
  if (!item) return null;
  const colors = {
    task: 'bg-yellow-200 dark:bg-yellow-700',
    'user story': 'bg-blue-200 dark:bg-blue-700',
    bug: 'bg-red-200 dark:bg-red-700',
    feature: 'bg-purple-200 dark:bg-purple-700',
  };
  const colorClass = colors[item.type?.toLowerCase()] || 'bg-gray-200 dark:bg-gray-700';
  return (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${colorClass}`}>{item.title}</span>
  );
}
