import React from 'react';

export default function ReviewPanel({ blocks, weekStart, onSubmit }) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const unsubmitted = blocks.filter((b) => {
    const start = new Date(b.start);
    return start >= weekStart && start < weekEnd && b.status !== 'submitted';
  });

  return (
    <div className="mb-4">
      <h2 className="font-semibold">Review</h2>
      {unsubmitted.length === 0 ? (
        <p className="text-sm">All blocks submitted</p>
      ) : (
        <div className="space-y-2">
          {unsubmitted.map((b) => (
            <div key={b.id} className="border p-1 text-xs flex justify-between">
              <span>
                {new Date(b.start).toLocaleString()} -{' '}
                {new Date(b.end).toLocaleTimeString()} {b.workItem}
              </span>
              <button
                className="px-1 bg-blue-500 text-white"
                onClick={() => onSubmit(b.id)}
              >
                Mark Submitted
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
