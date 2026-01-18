import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';
import { formatLocalDateKey } from '../utils/date';

export function normalizeLockedDays(map = {}) {
  if (!map || typeof map !== 'object') return {};
  const normalized = {};
  Object.entries(map).forEach(([key, value]) => {
    if (!value) return;
    const normalizedValue =
      value === 'auto'
        ? 'auto'
        : value === 'manual' || value === true
        ? 'manual'
        : typeof value === 'string' && value.trim() === 'auto'
        ? 'auto'
        : 'manual';
    let normalizedKey = key;
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      const parsed = new Date(`${key}T00:00:00`);
      normalizedKey = formatLocalDateKey(parsed) || key;
    } else {
      const parsed = new Date(key);
      const localKey = formatLocalDateKey(parsed);
      if (localKey) normalizedKey = localKey;
    }
    normalized[normalizedKey] = normalizedValue;
  });
  return normalized;
}

export default function useDayLocks() {
  const [lockedDays, setLockedDays] = useState({});

  useEffect(() => {
    const storage = new StorageService('lockedDays', { lockedDays: {} });
    const data = storage.read();
    setLockedDays(normalizeLockedDays(data.lockedDays || {}));
  }, []);

  useEffect(() => {
    const storage = new StorageService('lockedDays');
    storage.write({ lockedDays });
  }, [lockedDays]);

  return { lockedDays, setLockedDays };
}
