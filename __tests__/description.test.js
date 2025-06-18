const AdoService = require('../src/services/adoService.js').default;

test('finds items with missing or short descriptions', () => {
  const svc = new AdoService();
  const items = [
    { id: '1', type: 'Feature', description: 'This description is long enough to pass the check.' },
    { id: '2', type: 'Feature', description: '' },
    { id: '3', type: 'Feature', description: 'Too short' },
    { id: '4', type: 'Task', description: '' },
  ];
  const missing = svc.findMissingOrShortDescription(items);
  const ids = missing.map(i => i.id);
  expect(ids).toEqual(expect.arrayContaining(['2', '3']));
  expect(ids).not.toContain('1');
  expect(ids).not.toContain('4');
});
