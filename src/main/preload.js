const { ipcRenderer } = require('electron');

// With contextIsolation disabled we can assign directly to the window
// object instead of using contextBridge.
window.api = {
  openWorkItems: (items) => ipcRenderer.send('open-work-items', items),
};
