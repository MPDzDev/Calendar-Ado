const AdoService = require('../src/services/adoService.js').default;

test('detects invalid hierarchy', () => {
  const svc = new AdoService();
  const items = [
    { id: '1', title: 'Epic', type: 'Epic' },
    { id: '2', title: 'Feature no parent', type: 'Feature' },
    { id: '3', title: 'Feature ok', type: 'Feature', parentId: '1' },
    { id: '4', title: 'Story wrong parent', type: 'User Story', parentId: '2' },
    { id: '5', title: 'Story ok', type: 'User Story', parentId: '3' },
    { id: '6', title: 'Task bad parent', type: 'Task', parentId: '3' },
    { id: '7', title: 'Task ok', type: 'Task', parentId: '5' },
    { id: '8', title: 'Bug wrong parent', type: 'Bug', parentId: '5' },
    { id: '9', title: 'Bug ok', type: 'Bug', parentId: '3' },
    { id: '10', title: 'Transversal bad', type: 'Transversal Activity', parentId: '5' },
    { id: '11', title: 'Transversal ok', type: 'Transversal Activity', parentId: '3' },
  ];
  const problems = svc.findTreeProblems(items);
  const ids = problems.map(p => p.id);
  expect(ids).toEqual(expect.arrayContaining(['2', '4', '6', '8', '10']));
  expect(ids).not.toContain('3');
  expect(ids).not.toContain('5');
  expect(ids).not.toContain('7');
  expect(ids).not.toContain('9');
  expect(ids).not.toContain('11');
});
