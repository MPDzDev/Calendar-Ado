const AdoService = require('../src/services/adoService.js').default;

test('finds items with missing or short acceptance criteria', () => {
  const svc = new AdoService();
  const items = [
    { id: '1', type: 'User Story', acceptanceCriteria: 'complete work to spec' },
    { id: '2', type: 'User Story', acceptanceCriteria: '' },
    { id: '3', type: 'User Story', acceptanceCriteria: 'too short' },
    { id: '4', type: 'Task', acceptanceCriteria: '' },
  ];
  const missing = svc.findMissingAcceptanceCriteria(items, 20, ['User Story']);
  const ids = missing.map((i) => i.id);
  expect(ids).toEqual(expect.arrayContaining(['2', '3']));
  expect(ids).not.toContain('1');
  expect(ids).not.toContain('4');
});
