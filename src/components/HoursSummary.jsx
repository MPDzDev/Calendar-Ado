import React from 'react';

export default function HoursSummary({ blocks, weekStart, items }) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const totalHours = blocks
    .filter((b) => {
      const start = new Date(b.start);
      return start >= weekStart && start < weekEnd;
    })
    .reduce((sum, b) => {
      const start = new Date(b.start);
      const end = new Date(b.end);
      const diff = (end - start) / (1000 * 60 * 60);
      return sum + diff;
    }, 0);

  const assignedHours = blocks
    .filter((b) => {
      const start = new Date(b.start);
      return start >= weekStart && start < weekEnd && b.taskId;
    })
    .reduce((sum, b) => {
      const start = new Date(b.start);
      const end = new Date(b.end);
      const diff = (end - start) / (1000 * 60 * 60);
      return sum + diff;
    }, 0);

  const misconfiguredHours = blocks
    .filter((b) => {
      const start = new Date(b.start);
      if (!(start >= weekStart && start < weekEnd && b.taskId)) return false;
      const task = items?.find((i) => i.id === b.taskId);
      return !task || !task.area;
    })
    .reduce((sum, b) => {
      const start = new Date(b.start);
      const end = new Date(b.end);
      const diff = (end - start) / (1000 * 60 * 60);
      return sum + diff;
    }, 0);
  const overLimit = totalHours > 40;
  const textColor = overLimit ? 'text-red-600' : 'text-gray-800 dark:text-gray-200';

  return (
    <div className="mb-4">
      <span className="font-semibold">Total Hours: </span>
      <span className={`${textColor} font-bold`}>{totalHours.toFixed(2)}</span>
      <span className="font-semibold ml-2">Assigned: </span>
      <span className="font-bold">{assignedHours.toFixed(2)}</span>
      <span className="font-semibold ml-2">Wrong Config: </span>
      <span className="font-bold">{misconfiguredHours.toFixed(2)}</span>
    </div>
  );
}
