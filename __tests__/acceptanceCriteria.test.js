const AdoService = require('../src/services/adoService.js').default;

test('finds items missing acceptance criteria', () => {
  const svc = new AdoService();
  const items = [
    { id: '1', title: 'Story complete', acceptanceCriteria: 'done' },
    { id: '2', title: 'Story missing', acceptanceCriteria: '' },
    { id: '3', title: 'Story null' },
  ];
  const missing = svc.findMissingAcceptanceCriteria(items);
  const ids = missing.map(i => i.id);
  expect(ids).toEqual(expect.arrayContaining(['2', '3']));
  expect(ids).not.toContain('1');
});
