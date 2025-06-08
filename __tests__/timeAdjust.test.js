const {
  trimLunchOverlap,
  adjustForOverlap,
  splitByLunch,
} = require('../src/utils/timeAdjust');

describe('trimLunchOverlap', () => {
  const settings = { lunchStart: 12, lunchEnd: 13 };

  test('trims block overlapping lunch start', () => {
    const block = {
      start: '2023-01-01T11:30:00.000Z',
      end: '2023-01-01T12:30:00.000Z',
    };
    const result = trimLunchOverlap(block, settings);
    expect(result.start).toBe(block.start);
    expect(result.end).toBe('2023-01-01T12:00:00.000Z');
  });

  test('returns null when entirely within lunch', () => {
    const block = {
      start: '2023-01-01T12:10:00.000Z',
      end: '2023-01-01T12:50:00.000Z',
    };
    expect(trimLunchOverlap(block, settings)).toBeNull();
  });
});

describe('adjustForOverlap', () => {
  const existing = [
    { start: '2023-01-01T13:00:00.000Z', end: '2023-01-01T14:00:00.000Z' },
  ];

  test('trims overlapping end', () => {
    const block = {
      start: '2023-01-01T12:30:00.000Z',
      end: '2023-01-01T13:30:00.000Z',
    };
    const result = adjustForOverlap(existing, block);
    expect(result.end).toBe('2023-01-01T13:00:00.000Z');
  });

  test('moves start past existing block', () => {
    const block = {
      start: '2023-01-01T13:30:00.000Z',
      end: '2023-01-01T14:30:00.000Z',
    };
    const result = adjustForOverlap(existing, block);
    expect(result.start).toBe('2023-01-01T14:00:00.000Z');
  });

  test('returns null when inside another block', () => {
    const block = {
      start: '2023-01-01T13:15:00.000Z',
      end: '2023-01-01T13:45:00.000Z',
    };
    expect(adjustForOverlap(existing, block)).toBeNull();
  });
});

describe('splitByLunch', () => {
  const settings = { lunchStart: 12, lunchEnd: 13 };

  test('splits block crossing lunch', () => {
    const block = {
      start: '2023-01-01T11:00:00.000Z',
      end: '2023-01-01T14:00:00.000Z',
    };
    const result = splitByLunch(block, settings);
    expect(result).toHaveLength(2);
    expect(result[0].end).toBe('2023-01-01T12:00:00.000Z');
    expect(result[1].start).toBe('2023-01-01T13:00:00.000Z');
  });
});
