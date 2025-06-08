import React, { useEffect, useRef } from 'react';

export default function YearHint({ weekStart }) {
  const containerRef = useRef(null);

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  const weekNum = getWeekNumber(weekStart);

  useEffect(() => {
    if (containerRef.current) {
      const barWidth = 6; // width of each week bar in px
      containerRef.current.scrollLeft = Math.max(0, weekNum * barWidth - 48);
    }
  }, [weekNum]);

  const bars = Array.from({ length: 52 }, (_, i) => (
    <div
      key={i}
      className={`h-full flex-shrink-0 ${i + 1 === weekNum ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'}`}
      style={{ width: '6px', marginRight: '1px' }}
    />
  ));

  return (
    <div
      ref={containerRef}
      className="overflow-hidden w-32 h-2 ml-4 rounded bg-gray-200 dark:bg-gray-700"
    >
      <div className="flex h-full">{bars}</div>
    </div>
  );
}
