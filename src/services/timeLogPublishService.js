function normalizeBaseUrl(url = '') {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function parseResponseBody(res) {
  try {
    return await res.json();
  } catch (err) {
    try {
      const text = await res.text();
      return text ? { message: text } : null;
    } catch (e) {
      return null;
    }
  }
}

export async function createTimeLogEntry(config = {}, entry = {}, options = {}) {
  const fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchFn) {
    throw new Error('Fetch implementation is required for TimeLog creation.');
  }
  if (!config.baseUrl || !config.orgId || !config.apiKey) {
    throw new Error('TimeLog connection is not fully configured.');
  }

  const normalizedBase = normalizeBaseUrl(config.baseUrl);
  const url = `${normalizedBase}/${config.orgId}/timelog`;
  const payload = { ...entry };
  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'x-functions-key': config.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('TimeLog creation failed: unauthorized (check API key and permissions).');
  }
  if (!res.ok) {
    const body = await parseResponseBody(res);
    const detail = body?.message ? ` - ${body.message}` : '';
    throw new Error(`TimeLog creation failed: HTTP ${res.status}${detail}`);
  }
  return parseResponseBody(res);
}

export default {
  createTimeLogEntry,
};
