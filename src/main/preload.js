const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openWorkItems: (items) => ipcRenderer.send('open-work-items', items),
  getPassword: (service, account) =>
    ipcRenderer.invoke('keytar:get', service, account),
  setPassword: (service, account, password) =>
    ipcRenderer.invoke('keytar:set', service, account, password),
  deletePassword: (service, account) =>
    ipcRenderer.invoke('keytar:delete', service, account),
});
