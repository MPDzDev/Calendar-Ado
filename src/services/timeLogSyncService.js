import { getWeekNumber } from '../utils/date';
import { validateTimeLogSettings } from '../utils/validation';

export const TIME_LOG_SOURCE = 'TimeLog';
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const DEFAULT_LOOKBACK = 365;
const DEFAULT_PAGE_SIZE = 100;
const MAX_RETRIES = 3;
const BASE_DELAY = 400;
const MAX_DAILY_MINUTES = 8 * 60;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toIsoString = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const parseDateOnly = (value) => {
  if (!value) return new Date();
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00Z`);
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) && !(/[zZ]|[+-]\d{2}:\d{2}$/.test(value))) {
      return new Date(`${value}Z`);
    }
  }
  return new Date(value);
};

const getDayStart = (date, startHour) => {
  const d = new Date(date.getTime());
  d.setHours(startHour, 0, 0, 0);
  return d;
};

const getLunchConfig = (settings, startHour) => {
  const lunchStartHour = Number.isFinite(settings.lunchStart)
    ? settings.lunchStart
    : startHour + 3;
  const lunchEndHour = Number.isFinite(settings.lunchEnd)
    ? settings.lunchEnd
    : lunchStartHour + 1;
  const lunchDuration = Math.max(0, (lunchEndHour - lunchStartHour) * 60);
  const morningMinutes = Math.max(0, (lunchStartHour - startHour) * 60);
  const hasLunch =
    lunchDuration > 0 &&
    lunchStartHour > startHour &&
    lunchEndHour > lunchStartHour;
  return {
    lunchDuration,
    morningMinutes,
    hasLunch,
    lunchStartHour,
    lunchEndHour,
  };
};

const applyWorkingMinutes = (dayStart, workMinutes, lunchConfig) => {
  if (!lunchConfig.hasLunch) {
    return new Date(dayStart.getTime() + workMinutes * 60000);
  }
  const extra =
    workMinutes > lunchConfig.morningMinutes ? lunchConfig.lunchDuration : 0;
  return new Date(dayStart.getTime() + (workMinutes + extra) * 60000);
};

const getDayTime = (date, hour) => {
  const d = new Date(date.getTime());
  d.setHours(hour, 0, 0, 0);
  return d;
};

const splitSegmentsForLunch = (start, end, lunchStart, lunchEnd) => {
  if (!lunchStart || !lunchEnd || end <= lunchStart || start >= lunchEnd) {
    return [{ start, end }];
  }
  const segments = [];
  if (start < lunchStart) {
    segments.push({
      start,
      end: new Date(Math.min(end.getTime(), lunchStart.getTime())),
    });
  }
  if (end > lunchEnd) {
    const segStart = new Date(Math.max(start.getTime(), lunchEnd.getTime()));
    segments.push({ start: segStart, end });
  }
  if (!segments.length) {
    segments.push({ start: new Date(lunchEnd.getTime()), end });
  }
  return segments;
};

const blockDurationMinutes = (block) => {
  if (!block?.start || !block?.end) return 0;
  const start = new Date(block.start);
  const end = new Date(block.end);
  return Math.round((end.getTime() - start.getTime()) / 60000);
};

const getBlockDateKey = (block) => block?.timeLogMeta?.workDate || toDateKey(block?.start);

const snapshotBlock = (block) => ({
  id: block.id,
  date: block.timeLogMeta?.workDate || toDateKey(block.start),
  minutes: blockDurationMinutes(block),
  externalId: block.externalId || null,
  taskId: block.taskId || null,
  workItem: block.workItem || null,
  note: block.note || '',
  segmentIndex: block.timeLogMeta?.segmentIndex ?? null,
  segmentCount: block.timeLogMeta?.segmentCount ?? null,
  syncStatus: block.syncStatus || null,
  updatedAt: block.updatedAt || null,
  timeLogMeta: block.timeLogMeta || null,
});

const snapshotEntry = (entry) => ({
  timeLogId: entry.originalTimeLogId || entry.timeLogId,
  segmentKey: entry.segmentKey || null,
  segmentIndex: entry.segmentIndex ?? null,
  minutes: entry.minutes,
  date: toDateKey(entry.date),
  workItemId: entry.workItemId ?? null,
  timeTypeId: entry.timeTypeId ?? null,
  timeTypeDescription: entry.timeTypeDescription || '',
  comment: entry.comment || '',
  createdOn: entry.createdOn || '',
  projectId: entry.projectId || null,
  userId: entry.userId || null,
});

const normalizeEntry = (entry) => ({
  timeLogId: entry.timeLogId?.toString(),
  minutes: parseInt(entry.minutes, 10) || 0,
  date: entry.date,
  createdOn: entry.createdOn,
  workItemId: entry.workItemId ?? null,
  projectId: entry.projectId ?? null,
  timeTypeId: entry.timeTypeId ?? null,
  timeTypeDescription: entry.timeTypeDescription || '',
  comment: entry.comment || '',
  userId: entry.userId || null,
  userName: entry.userName || '',
});

const compareBlockToEntry = (block, entry) => {
  const diff = [];
  if (blockDurationMinutes(block) !== entry.minutes) {
    diff.push('minutes');
  }
  const localDate = block.timeLogMeta?.workDate || toDateKey(block.start);
  if (localDate !== toDateKey(entry.date)) {
    diff.push('date');
  }
  const localWorkItem = block.taskId || block.itemId || null;
  const remoteWorkItem = entry.workItemId ? entry.workItemId.toString() : null;
  if ((localWorkItem || remoteWorkItem) && localWorkItem?.toString() !== remoteWorkItem) {
    diff.push('workItemId');
  }
  const localType =
    (block.timeLogMeta?.timeTypeId || block.timeLogMeta?.timeTypeDescription || '').toString();
  const remoteType =
    (entry.timeTypeId || entry.timeTypeDescription || '').toString();
  if (localType.toLowerCase() !== remoteType.toLowerCase()) {
    diff.push('timeType');
  }
  const localComment = (block.timeLogMeta?.comment || block.note || '').trim();
  const remoteComment = (entry.comment || '').trim();
  if (localComment !== remoteComment) {
    diff.push('comment');
  }
  return diff;
};

const buildBlocksFromEntry = (entry, settings = {}, placementMap = {}) => {
  const syncedAt = new Date().toISOString();
  const workDate = parseDateOnly(entry.date);
  const startHour = Number.isFinite(settings.startHour) ? settings.startHour : 9;
  const dateKeyRaw = toDateKey(entry.date || workDate) || toDateKey(workDate);
  const dateKey = dateKeyRaw || workDate.toISOString().split('T')[0];
  const offset = placementMap[dateKey] || 0;
  placementMap[dateKey] = offset + entry.minutes;
  const dayStart = getDayStart(workDate, startHour);
  const lunchConfig = getLunchConfig(settings, startHour);
  const absoluteStart = applyWorkingMinutes(dayStart, offset, lunchConfig);
  const absoluteEnd = applyWorkingMinutes(dayStart, offset + entry.minutes, lunchConfig);
  const lunchStart = lunchConfig.hasLunch
    ? getDayTime(workDate, lunchConfig.lunchStartHour)
    : null;
  const lunchEnd = lunchConfig.hasLunch
    ? getDayTime(workDate, lunchConfig.lunchEndHour)
    : null;
  const segments = splitSegmentsForLunch(absoluteStart, absoluteEnd, lunchStart, lunchEnd);

  return segments.map((segment, index) => {
    const minutes = Math.max(0, Math.round((segment.end - segment.start) / 60000));
    return {
      block: {
        id: `timelog-${entry.timeLogId}-${index}`,
        start: segment.start.toISOString(),
        end: segment.end.toISOString(),
        note: (entry.comment || '').trim(),
        workItem: entry.workItemId ? `Azure #${entry.workItemId}` : '',
        taskId: entry.workItemId ? entry.workItemId.toString() : null,
        itemId: entry.workItemId ? entry.workItemId.toString() : null,
        comments: [],
        status: 'imported',
        syncStatus: 'synced',
        updatedAt: syncedAt,
        externalSource: TIME_LOG_SOURCE,
        externalId: entry.timeLogId,
        timeLogMeta: {
          workDate: dateKey,
          minutes,
          createdOn: entry.createdOn || null,
          workItemId: entry.workItemId ?? null,
          projectId: entry.projectId ?? null,
          timeTypeId: entry.timeTypeId ?? null,
          timeTypeDescription: entry.timeTypeDescription || '',
          comment: (entry.comment || '').trim(),
          week: getWeekNumber(workDate),
          userId: entry.userId || '',
          userName: entry.userName || '',
          segmentIndex: index,
          segmentCount: segments.length,
          remoteTimeLogId: entry.timeLogId,
          lastSyncedAt: syncedAt,
        },
      },
      segmentKey: `${entry.timeLogId}:${index}`,
      segmentIndex: index,
      segmentMinutes: minutes,
      workDateKey: dateKey,
    };
  });
};

const heuristicMatch = (entry, blocks = []) => {
  const dateKey = toDateKey(entry.date);
  const targetMinutes = entry.minutes;
  const remoteWorkItemId = entry.workItemId ? entry.workItemId.toString() : null;
  const remoteType = (entry.timeTypeId || entry.timeTypeDescription || '').toString().toLowerCase();
  return blocks.find((block) => {
    if (block.externalSource === TIME_LOG_SOURCE && block.externalId) return false;
    if (toDateKey(block.start) !== dateKey) return false;
    if (blockDurationMinutes(block) !== targetMinutes) return false;
    const blockWorkItem =
      block.taskId?.toString() || block.itemId?.toString() || null;
    if (remoteWorkItemId && blockWorkItem && remoteWorkItemId === blockWorkItem) {
      return true;
    }
    const blockType = (
      block.timeLogMeta?.timeTypeId ||
      block.timeLogMeta?.timeTypeDescription ||
      ''
    )
      .toString()
      .toLowerCase();
    if (remoteType && blockType && blockType === remoteType) {
      return true;
    }
    return false;
  });
};

const buildDifferenceMessage = (fields = []) => {
  if (!fields.length) return 'Differences detected';
  return `Differences detected for: ${fields.join(', ')}`;
};

async function requestPage(url, apiKey, fetchFn, page, options = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetchFn(url, {
      headers: {
        'x-functions-key': apiKey,
        Accept: 'application/json',
      },
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error('TimeLog sync failed: unauthorized (check API key and permissions).');
    }
    if (!res.ok) {
      if (RETRYABLE_STATUS.has(res.status) && attempt < (options.maxRetries ?? MAX_RETRIES)) {
        const delay = (options.baseDelay ?? BASE_DELAY) * 2 ** attempt;
        await sleep(delay);
        attempt += 1;
        continue;
      }
      throw new Error(
        `TimeLog sync failed: HTTP ${res.status} while requesting page ${page}.`
      );
    }
    return res.json();
  }
}

export async function fetchTimeLogEntries(config, options = {}) {
  const fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchFn) {
    throw new Error('Fetch implementation is required for TimeLog sync.');
  }
  const pageSize = parseInt(config.pageSize, 10) || DEFAULT_PAGE_SIZE;
  const entries = [];
  let page = 1;
  const fromDateIso = toIsoString(options.fromDate);
  const toDateIso = toIsoString(options.toDate);
  const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const queryParts = [
      `userId=${encodeURIComponent(config.userId)}`,
      `page=${page}`,
      `pageSize=${pageSize}`,
    ];
    if (fromDateIso) {
      queryParts.push(`fromDate=${encodeURIComponent(fromDateIso)}`);
    }
    if (toDateIso) {
      queryParts.push(`toDate=${encodeURIComponent(toDateIso)}`);
    }
    const url = `${baseUrl}/${config.orgId}/timelog/query?${queryParts.join('&')}`;
    const data = await requestPage(url, config.apiKey, fetchFn, page, options);
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }
    data.forEach((raw) => entries.push(normalizeEntry(raw)));
    page += 1;
  }
  return entries;
}

export function mergeTimeLogs(blocks = [], remoteEntries = [], options = {}) {
  const settings = options.settings || {};
  const focusRange = options.focusRange || null;
  const focusStart =
    focusRange?.start instanceof Date
      ? new Date(focusRange.start.getTime())
      : focusRange?.start
      ? new Date(focusRange.start)
      : null;
  const focusEnd =
    focusRange?.end instanceof Date
      ? new Date(focusRange.end.getTime())
      : focusRange?.end
      ? new Date(focusRange.end)
      : null;
  const updatedBlocks = Array.isArray(blocks) ? [...blocks] : [];
  const remoteList = Array.isArray(remoteEntries) ? remoteEntries : [];
  const summary = {
    downloaded: remoteList.length,
    created: 0,
    identical: 0,
    differences: 0,
  };
  const differences = [];
  const lastSyncDate = options.lastSyncDate ? new Date(options.lastSyncDate) : null;
  const nowIso = new Date().toISOString();
  const unsyncedWeeklyBlocks = [];
  const unsyncedWeeklyIds = new Set();
  const localByExternalId = new Map();
  const placementMap = {};
  const trackedRemoteIds = new Set();
  const hasFocusRange =
    focusStart &&
    focusEnd &&
    !Number.isNaN(focusStart.getTime()) &&
    !Number.isNaN(focusEnd.getTime());
  const limitToFocusRange = Boolean(options.limitToFocusRange);
  const dayTotals = new Map();
  const adjustDayTotal = (dateKey, minutes) => {
    if (!dateKey || !Number.isFinite(minutes)) return;
    const current = dayTotals.get(dateKey) || 0;
    dayTotals.set(dateKey, current + minutes);
  };

  const blockInFocusWeek = (block) => {
    if (!hasFocusRange) return false;
    const dateKey = block.timeLogMeta?.workDate;
    if (dateKey) {
      const date = new Date(`${dateKey}T00:00:00Z`);
      if (!Number.isNaN(date.getTime())) {
        return date >= focusStart && date < focusEnd;
      }
    }
    if (!block.start) return false;
    const start = new Date(block.start);
    if (Number.isNaN(start.getTime())) return false;
    return start >= focusStart && start < focusEnd;
  };

  const addUnsyncedWeeklyBlock = (block) => {
    if (!blockInFocusWeek(block)) return;
    const key =
      block.id ||
      `${block.externalId || 'local'}:${block.timeLogMeta?.segmentIndex ?? 0}`;
    if (unsyncedWeeklyIds.has(key)) return;
    unsyncedWeeklyIds.add(key);
    unsyncedWeeklyBlocks.push(snapshotBlock(block));
  };

  updatedBlocks.forEach((block) => {
    adjustDayTotal(getBlockDateKey(block), blockDurationMinutes(block));
    if (block.externalSource === TIME_LOG_SOURCE && block.externalId) {
      const list = localByExternalId.get(block.externalId) || [];
      list.push(block);
      localByExternalId.set(block.externalId, list);
    }
  });

  const processedRemoteEntries = new Set();

  remoteList.forEach((entry) => {
    if (!entry.timeLogId || processedRemoteEntries.has(entry.timeLogId)) {
      return;
    }
    processedRemoteEntries.add(entry.timeLogId);
    if (entry.minutes <= 0) {
      return;
    }

    const segments = buildBlocksFromEntry(entry, settings, placementMap);
    const locals = localByExternalId.get(entry.timeLogId) || [];

    if (segments.length > 1 && locals.length === 1) {
      const idx = updatedBlocks.findIndex((b) => b.id === locals[0].id);
      if (idx >= 0) {
        adjustDayTotal(getBlockDateKey(updatedBlocks[idx]), -blockDurationMinutes(updatedBlocks[idx]));
        updatedBlocks.splice(idx, 1);
      }
      locals.splice(0, locals.length);
    }

    segments.forEach(({ block: newBlock, segmentKey, segmentIndex, segmentMinutes }) => {
      const localIdx = locals.findIndex(
        (b) => (b.timeLogMeta?.segmentIndex ?? 0) === segmentIndex
      );
      const local = localIdx >= 0 ? locals.splice(localIdx, 1)[0] : null;
      trackedRemoteIds.add(segmentKey);
      const segmentEntry = {
        ...entry,
        originalTimeLogId: entry.timeLogId,
        timeLogId: segmentKey,
        segmentKey,
        segmentIndex,
        minutes: segmentMinutes,
        date: newBlock.timeLogMeta.workDate,
      };
      const newBlockDateKey = newBlock.timeLogMeta?.workDate || toDateKey(newBlock.start);
      if (local) {
        const fields = compareBlockToEntry(local, segmentEntry);
        if (fields.length === 0) {
          summary.identical += 1;
        } else {
          differences.push({
            type: 'field-mismatch',
            fields,
            message: buildDifferenceMessage(fields),
            local: snapshotBlock(local),
            remote: snapshotEntry(segmentEntry),
          });
        }
        local.syncStatus = 'synced';
        local.updatedAt = nowIso;
        local.timeLogMeta = {
          ...(local.timeLogMeta || {}),
          lastSyncedAt: nowIso,
        };
        return;
      }
      const heuristic = heuristicMatch(segmentEntry, updatedBlocks);
      if (heuristic) {
        differences.push({
          type: 'needs-link',
          fields: ['externalId'],
          message:
            'Remote entry resembles a local manual entry. Link manually or adjust the block.',
          local: snapshotBlock(heuristic),
          remote: snapshotEntry(segmentEntry),
        });
        return;
      }
      const projectedMinutes = (dayTotals.get(newBlockDateKey) || 0) + segmentMinutes;
      if (projectedMinutes > MAX_DAILY_MINUTES) {
        differences.push({
          type: 'daily-limit-exceeded',
          fields: ['minutes'],
          message: `Skipping import for ${newBlockDateKey} because it would exceed the daily limit of 8 hours.`,
          local: {
            date: newBlockDateKey,
            minutes: dayTotals.get(newBlockDateKey) || 0,
            limit: MAX_DAILY_MINUTES,
          },
          remote: snapshotEntry(segmentEntry),
        });
        return;
      }
      updatedBlocks.push(newBlock);
      adjustDayTotal(newBlockDateKey, segmentMinutes);
      summary.created += 1;
    });
  });

  updatedBlocks.forEach((block) => {
    if (block.externalSource === TIME_LOG_SOURCE && block.externalId) {
      const segmentKey = `${block.externalId}:${block.timeLogMeta?.segmentIndex ?? 0}`;
      if (!trackedRemoteIds.has(segmentKey)) {
        if (lastSyncDate) {
          const updatedTime = block.updatedAt ? new Date(block.updatedAt) : null;
          const lastSynced = block.timeLogMeta?.lastSyncedAt
            ? new Date(block.timeLogMeta.lastSyncedAt)
            : null;
          const comparisonBase = updatedTime || lastSynced;
          if (comparisonBase && comparisonBase <= lastSyncDate) {
            return;
          }
        }
        const snapshot = snapshotBlock(block);
        if (limitToFocusRange && !blockInFocusWeek(block)) {
          return;
        }
        differences.push({
          type: 'missing-remote',
          fields: ['missing'],
          message:
            'Local TimeLog entry was not returned by the remote API in the current window.',
          local: snapshot,
          remote: null,
        });
        addUnsyncedWeeklyBlock(block);
      }
    }
  });

  let recommendRefreshDate = null;
  if (lastSyncDate) {
    updatedBlocks.forEach((block) => {
      if (block.externalSource !== TIME_LOG_SOURCE || !block.externalId) {
        return;
      }
      const updatedTime = block.updatedAt ? new Date(block.updatedAt) : null;
      if (!updatedTime || Number.isNaN(updatedTime.getTime())) {
        return;
      }
      const lastSynced = block.timeLogMeta?.lastSyncedAt
        ? new Date(block.timeLogMeta.lastSyncedAt)
        : null;
      if (lastSynced && Number.isNaN(lastSynced.getTime())) {
        return;
      }
      if (!lastSynced || updatedTime > lastSynced) {
        if (!recommendRefreshDate || updatedTime < recommendRefreshDate) {
          recommendRefreshDate = updatedTime;
        }
      }
    });
  }

  updatedBlocks.forEach((block) => {
    if (!blockInFocusWeek(block)) return;
    const isTimeLogBlock =
      block.externalSource === TIME_LOG_SOURCE && Boolean(block.externalId);
    const lastSynced = block.timeLogMeta?.lastSyncedAt
      ? new Date(block.timeLogMeta.lastSyncedAt)
      : null;
    const updatedTime = block.updatedAt ? new Date(block.updatedAt) : null;
    const validUpdated = updatedTime && !Number.isNaN(updatedTime.getTime());
    const validLastSynced = lastSynced && !Number.isNaN(lastSynced.getTime());
    const needsAttention =
      !isTimeLogBlock ||
      (validUpdated && (!validLastSynced || updatedTime > lastSynced)) ||
      (isTimeLogBlock && block.syncStatus && block.syncStatus !== 'synced');
    if (needsAttention) {
      addUnsyncedWeeklyBlock(block);
    }
  });

  summary.differences = differences.length;

  return {
    blocks: updatedBlocks,
    report: {
      summary,
      differences,
      generatedAt: new Date().toISOString(),
      lookbackDays: parseInt(settings.timeLogLookbackDays, 10) || DEFAULT_LOOKBACK,
      recommendationDate: recommendRefreshDate
        ? recommendRefreshDate.toISOString()
        : null,
      unsyncedWeeklyBlocks,
      focusRange: hasFocusRange
        ? { start: focusStart.toISOString(), end: focusEnd.toISOString() }
        : null,
      limitToFocusRange,
    },
  };
}

export default class TimeLogSyncService {
  constructor(fetchFn = null) {
    this.fetchFn = fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
  }

  async sync({
    settings,
    blocks,
    now = new Date(),
    createdOnFromDate = null,
    focusRange = null,
    limitToFocusRange = false,
  }) {
    const validation = validateTimeLogSettings(settings);
    if (!validation.valid) {
      throw new Error(
        'TimeLog settings are incomplete. Please review the TimeLog tab in Settings.'
      );
    }
    if (!this.fetchFn) {
      throw new Error('Fetch implementation is required for TimeLog sync.');
    }
    const lookbackDays = parseInt(settings.timeLogLookbackDays, 10) || DEFAULT_LOOKBACK;
    const defaultFromDate = new Date(now);
    defaultFromDate.setDate(defaultFromDate.getDate() - lookbackDays);
    let fromDate = defaultFromDate;
    if (createdOnFromDate && !Number.isNaN(createdOnFromDate.getTime())) {
      fromDate = createdOnFromDate;
    }
    const fetchOptions = { fetchFn: this.fetchFn };
    if (limitToFocusRange && focusRange && focusRange.start && focusRange.end) {
      fetchOptions.fromDate = focusRange.start;
      fetchOptions.toDate = focusRange.end;
    } else {
      fetchOptions.fromDate = fromDate;
    }
    const entries = await fetchTimeLogEntries(
      {
        baseUrl: settings.timeLogBaseUrl,
        orgId: settings.timeLogOrgId,
        apiKey: settings.timeLogApiKey,
        userId: settings.timeLogUserId,
        pageSize: settings.timeLogPageSize || DEFAULT_PAGE_SIZE,
      },
      fetchOptions
    );
    return mergeTimeLogs(blocks, entries, {
      settings,
      lastSyncDate: createdOnFromDate,
      focusRange,
      limitToFocusRange,
    });
  }
}
