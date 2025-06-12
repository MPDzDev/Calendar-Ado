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
    { id: '8', title: 'Bug missing relation', type: 'Bug' },
    { id: '9', title: 'Bug wrong relation type', type: 'Bug', dependencies: ['7'] },
    { id: '10', title: 'Bug ok story relation', type: 'Bug', dependencies: ['5'] },
    { id: '11', title: 'Bug ok feature relation', type: 'Bug', dependencies: ['3'] },
    { id: '14', title: 'Bug with parent story', type: 'Bug', parentId: '5' },
    { id: '12', title: 'Transversal bad', type: 'Transversal Activity', parentId: '5' },
    { id: '13', title: 'Transversal ok', type: 'Transversal Activity', parentId: '3' },
  ];
  const problems = svc.findTreeProblems(items);
  const ids = problems.map(p => p.id);
  expect(ids).toEqual(expect.arrayContaining(['2', '4', '6', '8', '9', '12']));
  expect(ids).not.toContain('3');
  expect(ids).not.toContain('5');
  expect(ids).not.toContain('7');
  expect(ids).not.toContain('10');
  expect(ids).not.toContain('11');
  expect(ids).not.toContain('14');
  expect(ids).not.toContain('13');
});
