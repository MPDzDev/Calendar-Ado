const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // expose APIs here when needed
});
