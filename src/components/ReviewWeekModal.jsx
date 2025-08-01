import React, { useState } from 'react';

export default function ReviewWeekModal({ blocks = [], weekStart, onClose, onSubmit }) {
  const [selected, setSelected] = useState(new Set());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weekBlocks = blocks.filter((b) => {
    const start = new Date(b.start);
    return start >= weekStart && start < weekEnd;
  });

  const grouped = weekBlocks.reduce((acc, b) => {
    const key = b.status || 'draft';
    acc[key] = acc[key] || [];
    acc[key].push(b);
    return acc;
  }, {});

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markSubmitted = () => {
    onSubmit(Array.from(selected));
  };

  const renderList = (status) => (
    <div key={status} className="mb-2">
      <div className="font-semibold text-sm capitalize mb-1">
        {status} ({grouped[status].length})
      </div>
      <ul className="ml-2 space-y-1">
        {grouped[status].map((b) => (
          <li key={b.id}>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selected.has(b.id)}
                onChange={() => toggle(b.id)}
              />
              <span>
                {new Date(b.start).toLocaleDateString('en-US', {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                -
                {new Date(b.end).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {b.workItem && <span className="truncate"> - {b.workItem}</span>}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-4 max-h-[80vh] overflow-y-auto">
        <h3 className="font-semibold mb-2">Review Week</h3>
        {['draft', 'linked', 'submitted'].map(
          (s) => grouped[s] && grouped[s].length > 0 && renderList(s)
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-2 py-1 bg-gray-300 dark:bg-gray-700" onClick={onClose}>
            Close
          </button>
          <button className="px-2 py-1 bg-green-600 text-white" onClick={markSubmitted}>
            Mark Submitted
          </button>
        </div>
      </div>
    </div>
  );
}
