const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const TimeLogPushSuggestions = require('../src/components/TimeLogPushSuggestions.jsx').default;

describe('TimeLogPushSuggestions', () => {
  const suggestion = {
    id: 's1',
    workItemTitle: 'Work item',
    workItemId: 123,
    dayLabel: 'Mon',
    projectName: 'Proj',
    minutes: 60,
    blocks: [{ id: 'b1', note: 'Note', minutes: 60 }],
  };

  it('locks publishing when a resync is required', () => {
    const html = renderToStaticMarkup(
      React.createElement(TimeLogPushSuggestions, {
        suggestions: [suggestion],
        onClose: () => {},
        onCreateEntry: () => {},
        onCreateAll: () => {},
        statusMap: {},
        requiresResync: true,
        errorMessage: 'Run a TimeLog sync first.',
        metadata: { userName: 'User', userId: 'u1', projectMap: { Proj: 'p1' } },
        buildPayload: () => ({ payload: { ok: true } }),
      })
    );

    expect(html).toContain('Publishing is locked until you run a TimeLog sync.');
    expect(html).toContain('Sync Required');
    expect(html).not.toContain('Push All (1)');
  });
});
