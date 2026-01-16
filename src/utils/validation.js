export function isGuid(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    trimmed
  );
}

export function isHttpsUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

export function validateTimeLogSettings(settings = {}) {
  const errors = {};
  if (!settings.timeLogBaseUrl || !isHttpsUrl(settings.timeLogBaseUrl)) {
    errors.timeLogBaseUrl = 'Base URL must be a valid https URL';
  }
  if (!settings.timeLogOrgId || typeof settings.timeLogOrgId !== 'string' || !settings.timeLogOrgId.trim()) {
    errors.timeLogOrgId = 'Organization ID is required';
  }
  if (!settings.timeLogUserId || typeof settings.timeLogUserId !== 'string' || !settings.timeLogUserId.trim()) {
    errors.timeLogUserId = 'User ID is required';
  }
  if (!settings.timeLogApiKey) {
    errors.timeLogApiKey = 'API key is required';
  }
  const lookback = parseInt(settings.timeLogLookbackDays, 10);
  if (Number.isNaN(lookback) || lookback <= 0 || lookback > 2000) {
    errors.timeLogLookbackDays = 'Lookback days must be between 1 and 2000';
  }
  const pageSize = parseInt(settings.timeLogPageSize, 10);
  if (Number.isNaN(pageSize) || pageSize <= 0 || pageSize > 500) {
    errors.timeLogPageSize = 'Page size must be between 1 and 500';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
