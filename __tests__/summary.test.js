const { summarizeByArea } = require('../src/utils/summary');

test('groups hours by area', () => {
  const blocks = [
    { start: '2023-01-01T09:00:00.000Z', end: '2023-01-01T10:00:00.000Z', taskId: '1' },
    { start: '2023-01-01T11:00:00.000Z', end: '2023-01-01T12:30:00.000Z', taskId: '2' },
  ];
  const items = [
    { id: '1', area: 'AAA' },
    { id: '2', area: 'BBB' },
  ];
  const date = new Date('2023-01-01T00:00:00.000Z');
  const summary = summarizeByArea(blocks, items, date);
  expect(summary.AAA).toBeCloseTo(1);
  expect(summary.BBB).toBeCloseTo(1.5);
});

test('handles missing item', () => {
  const blocks = [
    { start: '2023-01-01T09:00:00.000Z', end: '2023-01-01T10:00:00.000Z', taskId: '1' },
  ];
  const items = [];
  const date = new Date('2023-01-01T00:00:00.000Z');
  const summary = summarizeByArea(blocks, items, date);
  expect(summary.Unassigned).toBeCloseTo(1);
});

test('prefers task area over item area', () => {
  const blocks = [
    {
      start: '2023-01-01T09:00:00.000Z',
      end: '2023-01-01T10:00:00.000Z',
      taskId: '1',
      itemId: '2',
    },
  ];
  const items = [
    { id: '1', area: 'AAA' },
    { id: '2', area: 'BBB' },
  ];
  const date = new Date('2023-01-01T00:00:00.000Z');
  const summary = summarizeByArea(blocks, items, date);
  expect(summary.AAA).toBeCloseTo(1);
  expect(summary.BBB).toBeUndefined();
});
