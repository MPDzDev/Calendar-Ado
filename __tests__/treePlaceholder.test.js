const { buildTree } = require('../src/components/WorkItems.jsx');

test('creates placeholders for missing parents', () => {
  const items = [
    { id: '1', title: 'Lonely Feature', type: 'Feature' },
    { id: '2', title: 'Lonely Story', type: 'User Story' },
    { id: '3', title: 'Epic', type: 'Epic' },
    { id: '4', title: 'Child Feature', type: 'Feature', parentId: '3' },
  ];
  const tree = buildTree(items);
  const epicPh = tree.find((n) => n.id === '__placeholder_epic__');
  const featurePh = tree.find((n) => n.id === '__placeholder_feature__');
  expect(epicPh.children.map((c) => c.id)).toContain('1');
  expect(featurePh.children.map((c) => c.id)).toContain('2');
  expect(tree.some((n) => n.id === '3')).toBe(true);
});

test('omits placeholders when not needed', () => {
  const items = [
    { id: '10', title: 'Epic', type: 'Epic' },
    { id: '11', title: 'Feature', type: 'Feature', parentId: '10' },
  ];
  const tree = buildTree(items);
  const hasEpicPh = tree.some((n) => n.id === '__placeholder_epic__');
  const hasFeaturePh = tree.some((n) => n.id === '__placeholder_feature__');
  expect(hasEpicPh).toBe(false);
  expect(hasFeaturePh).toBe(false);
});
