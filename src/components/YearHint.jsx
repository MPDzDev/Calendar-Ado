import React from 'react';

export default function YearHint({
  weekStart,
  blocks = [],
  settings = {},
  items = [],
}) {
  const startHour = settings.startHour ?? 0;
  const endHour = settings.endHour ?? 24;
  const hours = endHour - startHour;

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const firstWeek = getWeekStart(new Date(weekStart.getFullYear(), 0, 1));
  const weeks = Array.from({ length: 52 }, (_, i) => {
    const d = new Date(firstWeek);
    d.setDate(firstWeek.getDate() + i * 7);
    return d;
  });

  const weekWidth = 14; // px width per week
  const dayWidth = weekWidth / 7;
  const hourHeight = 2; // px height per hour
  const totalHeight = hours * hourHeight;

  const findItem = (id) => items?.find((i) => i.id === id);

  const currentIndex = Math.floor(
    (getWeekStart(weekStart) - firstWeek) / (7 * 24 * 60 * 60 * 1000)
  );

  const blocksByWeek = {};
  blocks.forEach((b) => {
    if (!b.start || !b.end) return;
    const start = new Date(b.start);
    const end = new Date(b.end);
    const wIdx = Math.floor(
      (getWeekStart(start) - firstWeek) / (7 * 24 * 60 * 60 * 1000)
    );
    if (wIdx < 0 || wIdx >= 52) return;
    const dIdx = (start.getDay() + 6) % 7;
    const startMin =
      start.getHours() * 60 + start.getMinutes() - startHour * 60;
    const endMin = end.getHours() * 60 + end.getMinutes() - startHour * 60;
    const item = b.itemId ? findItem(b.itemId) : b.taskId ? findItem(b.taskId) : null;
    const color = item ? settings.projectColors?.[item.project] : undefined;
    if (!blocksByWeek[wIdx]) blocksByWeek[wIdx] = Array.from({ length: 7 }, () => []);
    blocksByWeek[wIdx][dIdx].push({
      start: startMin,
      end: endMin,
      taskId: b.taskId,
      color,
    });
  });

  const months = Array.from({ length: 12 }, (_, m) => {
    const start = new Date(weekStart.getFullYear(), m, 1);
    const end = new Date(weekStart.getFullYear(), m + 1, 1);
    const startIdx = Math.floor(
      (getWeekStart(start) - firstWeek) / (7 * 24 * 60 * 60 * 1000)
    );
    const endIdx = Math.floor(
      (getWeekStart(end) - firstWeek) / (7 * 24 * 60 * 60 * 1000)
    );
    return {
      name: start.toLocaleString('en-US', { month: 'short' }),
      startIdx,
      endIdx,
    };
  });

  const monthLines = months
    .map((m) => (m.startIdx > 0 && m.startIdx < 52 ? m.startIdx : null))
    .filter((i) => i !== null);

  return (
    <div className="relative ml-4" style={{ width: weekWidth * 52 + 'px' }}>
      <div className="flex text-[10px] mb-1">
        {months.map((m, idx) => {
          const start = Math.max(m.startIdx, 0);
          const end = Math.min(m.endIdx, 52);
          const w = (end - start) * weekWidth;
          if (w <= 0) return null;
          return (
            <div key={idx} style={{ width: w + 'px', textAlign: 'center' }}>
              {m.name}
            </div>
          );
        })}
      </div>
      <svg width={weekWidth * 52} height={totalHeight} className="block">
        {weeks.map((_, w) => (
          <g key={w} transform={`translate(${w * weekWidth},0)`}>
            {Array.from({ length: 7 }, (_, d) => (
              <rect
                key={d}
                x={d * dayWidth}
                y={0}
                width={dayWidth}
                height={totalHeight}
                fill="none"
                stroke="#ccc"
                strokeWidth="0.5"
              />
            ))}
            {blocksByWeek[w] &&
              blocksByWeek[w].flatMap((dayBlocks, d) =>
                dayBlocks.map((blk, i) => (
                  <rect
                    key={d + '-' + i}
                    x={d * dayWidth}
                    y={(blk.start / 60) * hourHeight}
                    width={dayWidth}
                    height={((blk.end - blk.start) / 60) * hourHeight}
                    fill={blk.color || (blk.taskId ? '#60a5fa' : '#cbd5e1')}
                  />
                ))
              )}
          </g>
        ))}
        {monthLines.map((i, idx) => (
          <line
            key={idx}
            x1={i * weekWidth}
            x2={i * weekWidth}
            y1={0}
            y2={totalHeight}
            stroke="#666"
            strokeWidth="1"
          />
        ))}
        <g
          className="minimap-highlight"
          style={{ transform: `translateX(${currentIndex * weekWidth}px)` }}
        >
          <rect
            x={0}
            y={0}
            width={weekWidth}
            height={totalHeight}
            fill="none"
            strokeWidth="2"
          />
        </g>
      </svg>
    </div>
  );
}

