export function isOverlappingLunch(block, settings) {
  const start = new Date(block.start);
  const end = new Date(block.end);
  const lunchStart = new Date(start);
  lunchStart.setHours(settings.lunchStart, 0, 0, 0);
  const lunchEnd = new Date(start);
  lunchEnd.setHours(settings.lunchEnd, 0, 0, 0);
  return start < lunchEnd && end > lunchStart;
}

export function trimLunchOverlap(block, settings) {
  if (!isOverlappingLunch(block, settings)) return block;
  const start = new Date(block.start);
  const end = new Date(block.end);
  const lunchStart = new Date(start);
  lunchStart.setHours(settings.lunchStart, 0, 0, 0);
  const lunchEnd = new Date(start);
  lunchEnd.setHours(settings.lunchEnd, 0, 0, 0);

  if (start >= lunchStart && end <= lunchEnd) {
    return null;
  }

  if (start < lunchStart && end > lunchStart && end <= lunchEnd) {
    end.setTime(lunchStart.getTime());
  } else if (start >= lunchStart && start < lunchEnd && end > lunchEnd) {
    start.setTime(lunchEnd.getTime());
  } else if (start < lunchStart && end > lunchEnd) {
    const before = lunchStart - start;
    const after = end - lunchEnd;
    if (before >= after) {
      end.setTime(lunchStart.getTime());
    } else {
      start.setTime(lunchEnd.getTime());
    }
  }

  if (end <= start) return null;

  return { ...block, start: start.toISOString(), end: end.toISOString() };
}

export function splitByLunch(block, settings) {
  const start = new Date(block.start);
  const end = new Date(block.end);
  const lunchStart = new Date(start);
  lunchStart.setHours(settings.lunchStart, 0, 0, 0);
  const lunchEnd = new Date(start);
  lunchEnd.setHours(settings.lunchEnd, 0, 0, 0);

  if (start < lunchStart && end > lunchEnd) {
    return [
      { ...block, end: lunchStart.toISOString() },
      { ...block, start: lunchEnd.toISOString() },
    ];
  }
  return [block];
}

export function hasOverlap(blocks, newBlock) {
  const newStart = new Date(newBlock.start);
  const newEnd = new Date(newBlock.end);
  return blocks.some((b) => {
    const start = new Date(b.start);
    const end = new Date(b.end);
    return newStart < end && newEnd > start;
  });
}

export function adjustForOverlap(blocks, newBlock) {
  let start = new Date(newBlock.start);
  let end = new Date(newBlock.end);

  const sorted = [...blocks].sort((a, b) => new Date(a.start) - new Date(b.start));

  for (const b of sorted) {
    const bStart = new Date(b.start);
    const bEnd = new Date(b.end);

    if (end > bStart && start < bEnd) {
      if (start < bStart) {
        end = new Date(Math.min(end, bStart));
      } else {
        start = new Date(Math.max(start, bEnd));
      }
    }
  }

  if (end <= start) {
    return null;
  }

  return { ...newBlock, start: start.toISOString(), end: end.toISOString() };
}

