const AdoService = require('../src/services/adoService.js').default;

test('getWorkItemsByIds returns fetched items', async () => {
  const svc = new AdoService('org', 'tok');
  jest.spyOn(svc, '_fetchItems').mockResolvedValue([
    { id: '1', parentId: null, dependencies: [] },
  ]);
  jest.spyOn(svc, '_fetchRelations').mockResolvedValue({});

  const items = await svc.getWorkItemsByIds(['1']);
  expect(items).toHaveLength(1);
  expect(items[0].id).toBe('1');
});

test('getWorkItemsByIds ignores empty input', async () => {
  const svc = new AdoService('org', 'tok');
  const result = await svc.getWorkItemsByIds([]);
  expect(result).toEqual([]);
});
