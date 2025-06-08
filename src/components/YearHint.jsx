import React from 'react';

export default function YearHint({ weekStart, blocks = [], settings = {} }) {
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
    if (!blocksByWeek[wIdx]) blocksByWeek[wIdx] = Array.from({ length: 7 }, () => []);
    blocksByWeek[wIdx][dIdx].push({ start: startMin, end: endMin, taskId: b.taskId });
  });

  const monthLines = Array.from({ length: 12 }, (_, m) => {
    const d = new Date(weekStart.getFullYear(), m, 1);
    const idx = Math.floor(
      (getWeekStart(d) - firstWeek) / (7 * 24 * 60 * 60 * 1000)
    );
    return idx > 0 && idx < 52 ? idx : null;
  }).filter((i) => i !== null);

  return (
    <div className="relative ml-4" style={{ width: weekWidth * 52 + 'px' }}>
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
                    fill={blk.taskId ? '#60a5fa' : '#cbd5e1'}
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
        <rect
          x={currentIndex * weekWidth}
          y={0}
          width={weekWidth}
          height={totalHeight}
          fill="none"
          stroke="#facc15"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

