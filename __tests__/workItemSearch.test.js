const { matchesWorkItemSearch } = require('../src/components/WorkItems.jsx');

describe('matchesWorkItemSearch', () => {
  it('matches title text searches', () => {
    expect(
      matchesWorkItemSearch({ id: '12345', title: 'Fix retry logic' }, 'retry')
    ).toBe(true);
  });

  it('matches an exact pasted work item id', () => {
    expect(
      matchesWorkItemSearch({ id: '12345', title: 'Fix retry logic' }, '12345')
    ).toBe(true);
  });

  it('matches an exact pasted work item id with hash prefix', () => {
    expect(
      matchesWorkItemSearch({ id: '12345', title: 'Fix retry logic' }, '#12345')
    ).toBe(true);
  });

  it('does not match a different numeric id', () => {
    expect(
      matchesWorkItemSearch({ id: '12345', title: 'Fix retry logic' }, '123')
    ).toBe(false);
  });
});
