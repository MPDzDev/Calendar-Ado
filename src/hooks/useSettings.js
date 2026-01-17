import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';
import PatService from '../services/patService';
import TimeLogKeyService from '../services/timeLogKeyService';

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
  projectItems: {},
  fetchParents: true,
  azureTags: [],
  azureArea: '',
  azureIteration: '',
  sidebarWidth: 320,
  enableReminders: true,
  enableDevOpsReview: false,
  stateOrder: [
    'New',
    'Ready',
    'Active',
    'Installed in Test',
    'Verified',
    'Closed',
  ],
  timeLogBaseUrl: '',
  timeLogOrgId: '',
  timeLogApiKey: '',
  timeLogUserId: '',
  timeLogLookbackDays: 365,
  timeLogPageSize: 100,
  timeLogLastSync: null,
};

export default function useSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const storage = new StorageService('settings', defaultSettings);
    const data = storage.read();
    const patService = new PatService();
    const timeLogKeyService = new TimeLogKeyService();
    Promise.all([Promise.resolve(patService.get()), Promise.resolve(timeLogKeyService.get())])
      .then(([pat, timeLogKey]) => {
        if (data) {
          setSettings({
            ...defaultSettings,
            ...data,
            azurePat: pat,
            timeLogApiKey: timeLogKey,
          });
        } else {
          setSettings({
            ...defaultSettings,
            azurePat: pat,
            timeLogApiKey: timeLogKey,
          });
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const storage = new StorageService('settings');
    const { azurePat, timeLogApiKey, ...persist } = settings;
    storage.write(persist);
    const patService = new PatService();
    const timeLogKeyService = new TimeLogKeyService();
    Promise.resolve(patService.set(azurePat)).catch(() => {});
    Promise.resolve(timeLogKeyService.set(timeLogApiKey)).catch(() => {});
  }, [settings, loaded]);

  return { settings, setSettings };
}
