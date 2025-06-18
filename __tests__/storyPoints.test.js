const AdoService = require('../src/services/adoService.js').default;

test('finds items missing story points', () => {
  const svc = new AdoService();
  const items = [
    { id: '1', type: 'Feature', storyPoints: 5 },
    { id: '2', type: 'Feature' },
    { id: '3', type: 'User Story', storyPoints: null },
    { id: '4', type: 'Bug', storyPoints: 3 },
    { id: '5', type: 'Task' },
  ];
  const missing = svc.findMissingStoryPoints(items);
  const ids = missing.map(i => i.id);
  expect(ids).toEqual(expect.arrayContaining(['2', '3']));
  expect(ids).not.toContain('1');
  expect(ids).not.toContain('4');
  expect(ids).not.toContain('5');
});
