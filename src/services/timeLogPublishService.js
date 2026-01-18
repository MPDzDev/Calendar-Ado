const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const retryableStatuses = options.retryableStatuses || RETRYABLE_STATUS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = options.baseDelay ?? DEFAULT_BASE_DELAY;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
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
      if (retryableStatuses.has(res.status) && attempt < maxRetries) {
        const delay = baseDelay * 2 ** attempt;
        attempt += 1;
        await sleep(delay);
        continue;
      }
      throw new Error(`TimeLog creation failed: HTTP ${res.status}${detail}`);
    }
    return parseResponseBody(res);
  }
}

export default {
  createTimeLogEntry,
};
