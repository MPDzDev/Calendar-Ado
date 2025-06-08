const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openWorkItems: (items) => ipcRenderer.send('open-work-items', items),
});
