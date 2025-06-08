import React from 'react';

export default function ItemBubble({ item, full = false, showArea = false }) {
  if (!item) return null;
  const colors = {
    task: 'border-yellow-400',
    'user story': 'border-blue-400',
    bug: 'border-red-400',
    feature: 'border-purple-400',
  };
  const colorClass = colors[item.type?.toLowerCase()] || 'border-gray-400';
  const displayClass = full ? 'block w-full' : 'block';
  return (
    <div className={`${displayClass} pl-1 border-l-4 ${colorClass} text-xs`}>
      <div className="font-medium truncate" title={item.title}>
        {item.title}
      </div>
      {showArea && item.area && (
        <div className="text-[9px] mt-0.5 truncate" title={item.area}>
          {item.area}
        </div>
      )}
    </div>
  );
}
