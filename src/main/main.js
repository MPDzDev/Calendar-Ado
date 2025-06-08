const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    // When packaged, load the compiled React build instead of the public
    // development HTML. Using the development template results in a blank
    // window because it does not include the bundled scripts.
    win.loadFile(path.join(__dirname, '../../build/index.html'));
  }
}

function openWorkItemWindow({ url }) {
  // Opening in an external browser avoids issues with Azure DevOps not
  // rendering correctly inside an Electron BrowserWindow.
  shell.openExternal(url);
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('open-work-items', (_event, items) => {
    items.forEach(openWorkItemWindow);
  });

  ipcMain.on('get-user-data-path', (event) => {
    event.returnValue = app.getPath('userData');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
