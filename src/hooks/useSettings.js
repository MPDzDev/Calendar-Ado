import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';
import PatService from '../services/patService';

const defaultSettings = {
  startHour: 9,
  endHour: 17,
  lunchStart: 12,
  lunchEnd: 13,
  workDays: [0, 1, 2, 3, 4],
  blockMinutes: 15,
  darkMode: false,
  azureOrg: '',
  azurePat: '',
  azureProjects: [],
  projectColors: {},
  azureTags: [],
  azureArea: '',
  azureIteration: '',
  sidebarWidth: 256,
  enableReminders: true,
  stateOrder: [
    'New',
    'Ready',
    'Active',
    'Installed in Test',
    'Verified',
    'Closed',
  ],
};

export default function useSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const storage = new StorageService('settings', defaultSettings);
    const data = storage.read();
    const patService = new PatService();
    Promise.resolve(patService.get()).then((pat) => {
      if (data) {
        setSettings({ ...defaultSettings, ...data, azurePat: pat });
      } else {
        setSettings({ ...defaultSettings, azurePat: pat });
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const storage = new StorageService('settings');
    const { azurePat, ...persist } = settings;
    storage.write(persist);
    const patService = new PatService();
    patService.set(azurePat);
  }, [settings, loaded]);

  return { settings, setSettings };
}
