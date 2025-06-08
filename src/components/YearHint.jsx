import React, { useEffect, useRef } from 'react';

export default function YearHint({ weekStart, blocks = [] }) {
  const containerRef = useRef(null);

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  const weekNum = getWeekNumber(weekStart);

  const weekCounts = Array(52).fill(0);
  blocks.forEach((b) => {
    if (!b.start) return;
    const wk = getWeekNumber(new Date(b.start)) - 1;
    if (wk >= 0 && wk < 52) weekCounts[wk] += 1;
  });
  const maxCount = Math.max(...weekCounts, 0);

  useEffect(() => {
    if (containerRef.current) {
      const barWidth = 6; // width of each week bar in px
      containerRef.current.scrollLeft = Math.max(0, weekNum * barWidth - 48);
    }
  }, [weekNum]);

  const bars = Array.from({ length: 52 }, (_, i) => {
    const intensity = maxCount ? weekCounts[i] / maxCount : 0;
    const baseColor = i + 1 === weekNum ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600';
    const style = {
      width: '6px',
      marginRight: '1px',
      opacity: i + 1 === weekNum ? 1 : 0.2 + intensity * 0.8,
    };
    return <div key={i} className={`h-full flex-shrink-0 ${baseColor}`} style={style} />;
  });

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden w-32 h-2 ml-4 rounded bg-gray-200 dark:bg-gray-700"
    >
      <div className="flex h-full">{bars}</div>
      <div
        className="absolute top-0 bottom-0 border border-yellow-400 pointer-events-none"
        style={{
          left: `${(weekNum - 1) * 7}px`,
          width: '6px',
        }}
      />
    </div>
  );
}
