import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

export default function useDayLocks() {
  const [lockedDays, setLockedDays] = useState({});

  useEffect(() => {
    const storage = new StorageService('lockedDays', { lockedDays: {} });
    const data = storage.read();
    setLockedDays(data.lockedDays || {});
  }, []);

  useEffect(() => {
    const storage = new StorageService('lockedDays');
    storage.write({ lockedDays });
  }, [lockedDays]);

  return { lockedDays, setLockedDays };
}
