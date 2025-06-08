const { contextBridge, ipcRenderer } = require('electron');
const keytar = require('keytar');

contextBridge.exposeInMainWorld('api', {
  openWorkItems: (items) => ipcRenderer.send('open-work-items', items),
  getPassword: (service, account) => keytar.getPassword(service, account),
  setPassword: (service, account, password) =>
    keytar.setPassword(service, account, password),
  deletePassword: (service, account) =>
    keytar.deletePassword(service, account),
});
