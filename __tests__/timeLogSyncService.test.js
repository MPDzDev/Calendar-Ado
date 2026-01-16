const {
  fetchTimeLogEntries,
  mergeTimeLogs,
  TIME_LOG_SOURCE,
} = require('../src/services/timeLogSyncService');

describe('fetchTimeLogEntries', () => {
  it('paginates until API returns an empty array', async () => {
    const pages = [
      [{ timeLogId: '1', minutes: 60, date: '2025-01-01T00:00:00Z' }],
      [{ timeLogId: '2', minutes: 30, date: '2025-01-02T00:00:00Z' }],
      [],
    ];
    const fetchFn = jest.fn().mockImplementation(() => {
      const data = pages.shift();
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
      });
    });

    const entries = await fetchTimeLogEntries(
      {
        baseUrl: 'https://example.com',
        orgId: 'org',
        apiKey: 'key',
        userId: 'user',
        pageSize: 1,
      },
      new Date('2025-01-01T00:00:00Z'),
      { fetchFn }
    );

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(entries).toHaveLength(2);
    expect(entries[0].timeLogId).toBe('1');
    expect(entries[1].timeLogId).toBe('2');
  });
});

describe('mergeTimeLogs', () => {
  it('avoids duplicates on idempotent re-sync', () => {
    const settings = { startHour: 9, timeLogLookbackDays: 365 };
    const remoteEntries = [
      {
        timeLogId: 'TL-1',
        minutes: 75,
        date: '2025-03-01T00:00:00Z',
        comment: 'Initial sync',
      },
    ];

    const firstRun = mergeTimeLogs([], remoteEntries, { settings });
    expect(firstRun.report.summary.created).toBe(1);
    expect(firstRun.blocks).toHaveLength(1);

    const secondRun = mergeTimeLogs(firstRun.blocks, remoteEntries, { settings });
    expect(secondRun.report.summary.created).toBe(0);
    expect(secondRun.report.summary.identical).toBe(1);
    expect(secondRun.blocks).toHaveLength(1);
  });

  it('reports differences for minutes, date, workItemId, timeType, and comment mismatches', () => {
    const localBlock = {
      id: 'local-1',
      start: '2025-04-01T09:00:00.000Z',
      end: '2025-04-01T10:00:00.000Z',
      externalSource: TIME_LOG_SOURCE,
      externalId: 'TL-2',
      taskId: '100',
      timeLogMeta: {
        timeTypeId: 'A',
        comment: 'Original comment',
      },
    };
    const remoteEntries = [
      {
        timeLogId: 'TL-2',
        minutes: 120,
        date: '2025-04-02T00:00:00Z',
        workItemId: 200,
        timeTypeDescription: 'Updated Type',
        comment: 'New comment',
      },
    ];

    const result = mergeTimeLogs([localBlock], remoteEntries, {
      settings: { timeLogLookbackDays: 365 },
    });

    expect(result.report.differences).toHaveLength(1);
    const diffFields = result.report.differences[0].fields;
    expect(diffFields).toEqual(
      expect.arrayContaining(['minutes', 'date', 'workItemId', 'timeType', 'comment'])
    );
  });

  it('ignores changes to remote user names when matching entries', () => {
    const settings = { timeLogLookbackDays: 365 };
    const remoteEntries = [
      {
        timeLogId: 'TL-3',
        minutes: 60,
        date: '2025-05-01T00:00:00Z',
        userName: 'Alice',
      },
    ];
    const firstRun = mergeTimeLogs([], remoteEntries, { settings });

    const secondRun = mergeTimeLogs(firstRun.blocks, [
      { ...remoteEntries[0], userName: 'Alice Bobson' },
    ], { settings });

    expect(secondRun.report.summary.identical).toBe(1);
    expect(secondRun.report.summary.differences).toBe(0);
  });
});
