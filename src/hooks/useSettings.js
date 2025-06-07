import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

const defaultSettings = {
  startHour: 9,
  endHour: 17,
  workDays: [0, 1, 2, 3, 4],
};

export default function useSettings() {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const storage = new StorageService('settings', defaultSettings);
    const data = storage.read();
    if (data) {
      setSettings({ ...defaultSettings, ...data });
    }
  }, []);

  useEffect(() => {
    const storage = new StorageService('settings');
    storage.write(settings);
  }, [settings]);

  return { settings, setSettings };
}
