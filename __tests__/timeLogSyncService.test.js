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
      {
        fetchFn,
        fromDate: new Date('2025-01-01T00:00:00Z'),
      }
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

  it('suggests refresh dates based on updated timestamps of remote blocks only', () => {
    const updatedAt = '2025-04-05T10:00:00.000Z';
    const blocks = [
      {
        id: 'remote-1',
        start: '2025-04-01T09:00:00.000Z',
        end: '2025-04-01T10:15:00.000Z',
        externalSource: TIME_LOG_SOURCE,
        externalId: 'TL-remote',
        syncStatus: 'modified',
        updatedAt,
        timeLogMeta: {
          lastSyncedAt: '2025-04-02T10:00:00.000Z',
        },
      },
      {
        id: 'local-1',
        start: '2025-04-03T09:00:00.000Z',
        end: '2025-04-03T10:00:00.000Z',
        updatedAt: '2025-04-04T08:00:00.000Z',
      },
    ];

    const result = mergeTimeLogs(blocks, [], {
      settings: { timeLogLookbackDays: 365 },
      lastSyncDate: new Date('2025-04-06T00:00:00Z'),
    });

    expect(result.report.recommendationDate).toBe(updatedAt);
  });

  it('flags unsynced manual blocks within the focused week', () => {
    const blocks = [
      {
        id: 'local-2',
        start: '2026-01-19T09:00:00.000Z',
        end: '2026-01-19T11:00:00.000Z',
        note: 'Draft entry',
        syncStatus: 'draft',
        updatedAt: '2026-01-19T10:00:00.000Z',
      },
      {
        id: 'outside',
        start: '2026-02-01T09:00:00.000Z',
        end: '2026-02-01T10:00:00.000Z',
        syncStatus: 'draft',
        updatedAt: '2026-02-01T09:30:00.000Z',
      },
    ];

    const result = mergeTimeLogs(blocks, [], {
      settings: { timeLogLookbackDays: 365 },
      focusRange: {
        start: new Date('2026-01-19T00:00:00.000Z'),
        end: new Date('2026-01-26T00:00:00.000Z'),
      },
    });

    expect(result.report.unsyncedWeeklyBlocks).toHaveLength(1);
    expect(result.report.unsyncedWeeklyBlocks[0].id).toBe('local-2');
  });

  it('suppresses missing-remote differences outside the focused week when limited to focus', () => {
    const blocks = [
      {
        id: 'remote-only',
        start: '2026-02-01T09:00:00.000Z',
        end: '2026-02-01T10:00:00.000Z',
        externalSource: TIME_LOG_SOURCE,
        externalId: 'TL-outside',
        updatedAt: '2026-03-05T10:00:00.000Z',
        timeLogMeta: {
          lastSyncedAt: '2026-02-28T10:00:00.000Z',
        },
      },
    ];

    const result = mergeTimeLogs(blocks, [], {
      settings: { timeLogLookbackDays: 365 },
      focusRange: {
        start: new Date('2026-02-10T00:00:00.000Z'),
        end: new Date('2026-02-17T00:00:00.000Z'),
      },
      limitToFocusRange: true,
      lastSyncDate: new Date('2026-03-01T00:00:00.000Z'),
    });

    expect(result.report.differences).toHaveLength(0);
    expect(result.report.summary.differences).toBe(0);
  });

  it('skips importing remote entries when the daily total would exceed eight hours', () => {
    const localBlock = {
      id: 'local-3',
      start: '2026-01-20T09:00:00.000Z',
      end: '2026-01-20T15:00:00.000Z',
      note: 'Manual block',
    };
    const remoteEntries = [
      {
        timeLogId: 'TL-limit',
        minutes: 360,
        date: '2026-01-20T00:00:00Z',
        comment: 'Remote block',
      },
    ];

    const result = mergeTimeLogs([localBlock], remoteEntries, {
      settings: { startHour: 9, lunchStart: 9, lunchEnd: 9, timeLogLookbackDays: 365 },
    });

    expect(result.blocks).toHaveLength(1);
    expect(result.report.summary.created).toBe(0);
    const limitDiff = result.report.differences.find(
      (diff) => diff.type === 'daily-limit-exceeded'
    );
    expect(limitDiff).toBeTruthy();
    expect(limitDiff.local.minutes).toBe(360);
    expect(limitDiff.remote.minutes).toBe(360);
  });
});
