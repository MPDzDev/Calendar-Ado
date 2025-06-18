const { app, BrowserWindow, ipcMain } = require('electron');
const keytar = require('keytar');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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

function openWorkItemWindow({ id, hours, url, days, message }) {
  const win = new BrowserWindow({ width: 1000, height: 800 });
  win.loadURL(url);

  win.webContents.on('did-finish-load', () => {
    const messageSnippet = message
      ? `const note = document.createElement('div'); note.textContent = ${JSON.stringify(message)}; banner.appendChild(note);`
      : '';
    const hoursSnippet =
      hours > 0
        ? `const header = document.createElement('div');
           header.textContent = 'Suggested hours to log: ${hours.toFixed(2)}';
           banner.appendChild(header);
           const list = document.createElement('ul');
           const breakdown = ${JSON.stringify(days || [])};
           breakdown.forEach(([day, hrs]) => {
             const li = document.createElement('li');
             li.textContent = \`${day}: ${hrs.toFixed(2)}\`;
             list.appendChild(li);
           });
           banner.appendChild(list);`
        : '';
    const script = `
      const banner = document.createElement('div');
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '0';
      banner.style.right = '0';
      banner.style.zIndex = '10000';
      banner.style.background = '#fffae6';
      banner.style.padding = '10px';
      banner.style.textAlign = 'center';
      ${hoursSnippet}
      ${messageSnippet}
      document.body.appendChild(banner);
      document.body.style.marginTop = (banner.offsetHeight + 10) + 'px';
    `;
    win.webContents.executeJavaScript(script).catch(() => {});
  });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('open-work-items', (_event, items) => {
    items.forEach(openWorkItemWindow);
  });

  ipcMain.handle('keytar:get', async (_event, service, account) => {
    return keytar.getPassword(service, account);
  });

  ipcMain.handle('keytar:set', async (_event, service, account, password) => {
    if (password) {
      return keytar.setPassword(service, account, password);
    }
    return keytar.deletePassword(service, account);
  });

  ipcMain.handle('keytar:delete', async (_event, service, account) => {
    return keytar.deletePassword(service, account);
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
