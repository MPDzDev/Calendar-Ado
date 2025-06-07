const { app, BrowserWindow } = require('electron');
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

app.whenReady().then(() => {
  createWindow();

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
