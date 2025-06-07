// Placeholder for local storage interactions
// Dynamically require Node modules when running in Electron
let fs = null;
let path = null;
try {
  if (typeof window !== 'undefined' && window.require) {
    fs = window.require('fs');
    path = window.require('path');
  }
} catch (e) {
  fs = null;
  path = null;
}

export default class StorageService {
  constructor() {
    this.storageKey = 'workBlocks';
    if (fs && path) {
      this.dataPath = path.join(process.cwd(), 'data.json');
    }
  }

  read() {
    // Prefer filesystem when available (Electron)
    if (fs && path) {
      if (fs.existsSync(this.dataPath)) {
        return JSON.parse(fs.readFileSync(this.dataPath));
      }
      return { workBlocks: [] };
    }
    // Fallback to browser localStorage
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : { workBlocks: [] };
    }
    return { workBlocks: [] };
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
