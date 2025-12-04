const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');
const { initDB, onChange } = require('./database.cjs'); 
const startServer = require('./server.cjs');
const initScheduler = require('./services/scheduler.cjs');
const registerIpcHandlers = require('./ipcHandlers.cjs'); // YANGI: Handlerlarni chaqiramiz

// --- LOGGER SOZLAMALARI ---
log.transports.file.level = 'info';
log.transports.file.fileName = 'logs.txt';
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
Object.assign(console, log.functions);

process.on('uncaughtException', (error) => {
  log.error('KRITIK XATOLIK (Main):', error);
});
process.on('unhandledRejection', (reason) => {
  log.error('Ushlanmagan Promise:', reason);
});

app.disableHardwareAcceleration();

function createWindow() {
  try {
    initDB();
    startServer();
    initScheduler();
    
    // YANGI: Barcha IPC handlerlarni ro'yxatdan o'tkazish
    registerIpcHandlers(ipcMain);
    
    // Printerlarni olish (BrowserWindow kerak bo'lgani uchun shu yerda qoldi)
    ipcMain.handle('get-system-printers', async () => {
        const wins = BrowserWindow.getAllWindows();
        if (wins.length === 0) return [];
        const printers = await wins[0].webContents.getPrintersAsync();
        return printers;
    });

    log.info("Dastur ishga tushdi. Baza, Server va Scheduler yondi.");
  } catch (err) {
    log.error("Boshlang'ich yuklashda xato:", err);
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#f3f4f6',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
  });

  onChange((type, id) => {
    if (!win.isDestroyed()) {
      win.webContents.send('db-change', { type, id });
    }
  });

  // --- TUZATILDI: Oq ekran muammosi ---
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Agar dastur paketlanmagan bo'lsa (ya'ni biz kod yozyapmiz), localhostga ulanamiz
    if (!app.isPackaged) {
        win.loadURL('http://localhost:5173');
        console.log("Development rejimida: http://localhost:5173 yuklanmoqda...");
    } else {
        // Production rejimida faylni yuklaymiz
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  win.webContents.on('render-process-gone', (event, details) => {
    log.error('Renderer jarayoni quladi:', details.reason);
    if (details.reason === 'crashed') {
        win.reload();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { 
    log.info("Dastur yopildi.");
    if (process.platform !== 'darwin') app.quit(); 
});