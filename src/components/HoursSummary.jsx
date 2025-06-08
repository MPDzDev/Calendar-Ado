import React from 'react';

export default function HoursSummary({ blocks, weekStart, items }) {
  const WEEK_LIMIT = 40;
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
  const correctAssigned = Math.max(assignedHours - misconfiguredHours, 0);

  const overLimit = totalHours > WEEK_LIMIT;
  const textColor = overLimit ? 'text-red-600' : 'text-gray-800 dark:text-gray-200';

  const totalPercent = Math.min(totalHours, WEEK_LIMIT) / WEEK_LIMIT * 100;
  const assignedPercent = Math.min(correctAssigned, WEEK_LIMIT) / WEEK_LIMIT * 100;
  const misconfiguredPercent = Math.min(misconfiguredHours, WEEK_LIMIT) / WEEK_LIMIT * 100;

  return (
    <div className="mb-4 w-full">
      <div
        className={`relative h-3 rounded bg-gray-200 overflow-hidden ${overLimit ? 'ring-2 ring-amber-500' : ''}`}
      >
        <div
          className="absolute inset-0 bg-gray-400"
          style={{ width: `${totalPercent}%` }}
        />
        <div
          className="absolute inset-0 bg-green-500"
          style={{ width: `${assignedPercent}%` }}
        />
        <div
          className="absolute inset-0 bg-red-500"
          style={{ width: `${misconfiguredPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className={textColor}>{totalHours.toFixed(1)}h/{WEEK_LIMIT}</span>
        <span className="text-green-600">{correctAssigned.toFixed(1)}h</span>
        {misconfiguredHours > 0 && (
          <span className="text-red-600">{misconfiguredHours.toFixed(1)}h</span>
        )}
      </div>
    </div>
  );
}
