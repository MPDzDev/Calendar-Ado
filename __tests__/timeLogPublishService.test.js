const { createTimeLogEntry } = require('../src/services/timeLogPublishService');

describe('createTimeLogEntry', () => {
  const config = {
    baseUrl: 'https://example.com/api',
    orgId: 'org-123',
    apiKey: 'secret',
  };

  it('POSTs to the timelog endpoint and returns parsed JSON', async () => {
    const payload = {
      comment: 'Test',
      minutes: 60,
      timeTypeDescription: 'WORK_TIME',
      date: '2025-01-01',
      userId: 'user-1',
      userName: 'User One',
      projectId: 'proj-1',
    };
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ timeLogId: 'TL-100' }),
    });

    const result = await createTimeLogEntry(config, payload, { fetchFn });

    expect(fetchFn).toHaveBeenCalledWith(
      'https://example.com/api/org-123/timelog',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
    expect(result).toEqual({ timeLogId: 'TL-100' });
  });

  it('throws an error with HTTP status information when the request fails', async () => {
    const payload = { comment: 'bad', minutes: 10 };
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Invalid payload' }),
    });

    await expect(createTimeLogEntry(config, payload, { fetchFn })).rejects.toThrow(
      'HTTP 400'
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
