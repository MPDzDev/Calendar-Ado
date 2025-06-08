// Placeholder for local storage interactions
// Dynamically require Node modules when running in Electron
let fs = null;
let path = null;
let ipcRenderer = null;
let userDataPath = null;
try {
  if (typeof window !== 'undefined' && window.require) {
    fs = window.require('fs');
    path = window.require('path');
    ipcRenderer = window.require('electron').ipcRenderer;
    userDataPath = ipcRenderer.sendSync('get-user-data-path');
  }
} catch (e) {
  fs = null;
  path = null;
  ipcRenderer = null;
  userDataPath = null;
}

export default class StorageService {
  constructor(storageKey = 'workBlocks', defaultData = null) {
    this.storageKey = storageKey;
    this.defaultData = defaultData;
    if (fs && path) {
      const baseDir = userDataPath || process.cwd();
      this.dataPath = path.join(baseDir, `${storageKey}.json`);
    }
  }

  read() {
    // Prefer filesystem when available (Electron)
    if (fs && path) {
      if (fs.existsSync(this.dataPath)) {
        return JSON.parse(fs.readFileSync(this.dataPath));
      }
      return this.defaultData;
    }
    // Fallback to browser localStorage
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : this.defaultData;
    }
    return this.defaultData;
  }

  write(data) {
    if (fs && path) {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
  }
}
