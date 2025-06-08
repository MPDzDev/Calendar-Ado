const { app, BrowserWindow, ipcMain } = require('electron');
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

function openWorkItemWindow({ id, hours, url }) {
  const win = new BrowserWindow({ width: 500, height: 300 });
  const content = `
    <html>
      <body style="font-family: sans-serif; padding: 20px;">
        <h3>Work Item ${id}</h3>
        <p>Suggested hours to log: <strong>${hours.toFixed(2)}</strong></p>
        <p><a href="${url}" target="_blank">Open in Azure DevOps</a></p>
      </body>
    </html>`;
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(content));
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
