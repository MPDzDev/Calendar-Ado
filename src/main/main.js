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

function openWorkItemWindow({ hours, url }) {
  // Open work item in the user's default browser to avoid rendering issues
  // inside an Electron BrowserWindow.
  shell.openExternal(url);

  // Show an always-on-top banner window with the suggested hours since we
  // can no longer inject the banner directly into the ADO page.
  const bannerWin = new BrowserWindow({
    width: 420,
    height: 60,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
  });

  const bannerHtml = `<!DOCTYPE html>
    <html><body style="margin:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#fffae6;padding:10px;">
    Suggested hours to log: ${hours.toFixed(2)}
    </body></html>`;

  bannerWin.loadURL('data:text/html,' + encodeURIComponent(bannerHtml));

  setTimeout(() => {
    if (!bannerWin.isDestroyed()) {
      bannerWin.close();
    }
  }, 5000);
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('open-work-items', (_event, items) => {
    items.forEach(openWorkItemWindow);
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
