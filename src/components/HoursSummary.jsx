import React from 'react';

export default function HoursSummary({ blocks }) {
  const totalHours = blocks.reduce((sum, b) => {
    const start = new Date(b.start);
    const end = new Date(b.end);
    const diff = (end - start) / (1000 * 60 * 60);
    return sum + diff;
  }, 0);
  const overLimit = totalHours > 40;
  const textColor = overLimit ? 'text-red-600' : 'text-gray-800';

  return (
    <div className="mb-4">
      <span className="font-semibold">Total Hours: </span>
      <span className={`${textColor} font-bold`}>{totalHours.toFixed(2)}</span>
    </div>
  );
}
