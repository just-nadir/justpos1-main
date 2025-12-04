const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');
const { initDB, onChange } = require('./database.cjs'); 
const startServer = require('./server.cjs');
const initScheduler = require('./services/scheduler.cjs');

// --- LOGGER SOZLAMALARI ---
log.transports.file.level = 'info';
log.transports.file.fileName = 'logs.txt';
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
Object.assign(console, log.functions);

// Controllerlar
const tableController = require('./controllers/tableController.cjs');
const productController = require('./controllers/productController.cjs');
const orderController = require('./controllers/orderController.cjs');
const userController = require('./controllers/userController.cjs');
const settingsController = require('./controllers/settingsController.cjs');
const staffController = require('./controllers/staffController.cjs');
const smsController = require('./controllers/smsController.cjs');

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

  win.loadURL('http://localhost:5173');

  win.webContents.on('render-process-gone', (event, details) => {
    log.error('Renderer jarayoni quladi:', details.reason);
    if (details.reason === 'crashed') {
        win.reload();
    }
  });
}

// --- IPC HANDLERS (API) ---

// Zallar & Stollar
ipcMain.handle('get-halls', () => tableController.getHalls());
ipcMain.handle('add-hall', (e, name) => tableController.addHall(name));
ipcMain.handle('delete-hall', (e, id) => tableController.deleteHall(id));

ipcMain.handle('get-tables', () => tableController.getTables());
ipcMain.handle('get-tables-by-hall', (e, id) => tableController.getTablesByHall(id));
ipcMain.handle('add-table', (e, data) => tableController.addTable(data.hallId, data.name));
ipcMain.handle('delete-table', (e, id) => tableController.deleteTable(id));

ipcMain.handle('update-table-status', (e, data) => tableController.updateTableStatus(data.id, data.status));
ipcMain.handle('close-table', (e, id) => tableController.closeTable(id));

// Mijozlar & Qarzlar
ipcMain.handle('get-customers', () => userController.getCustomers());
ipcMain.handle('add-customer', (e, c) => userController.addCustomer(c));
ipcMain.handle('delete-customer', (e, id) => userController.deleteCustomer(id));

ipcMain.handle('get-debtors', () => userController.getDebtors());
ipcMain.handle('get-debt-history', (e, id) => userController.getDebtHistory(id));
ipcMain.handle('pay-debt', (e, data) => userController.payDebt(data.customerId, data.amount, data.comment));

// Menyu & Mahsulotlar
ipcMain.handle('get-categories', () => productController.getCategories());
ipcMain.handle('add-category', (e, name) => productController.addCategory(name));

ipcMain.handle('get-products', () => productController.getProducts());
ipcMain.handle('add-product', (e, p) => productController.addProduct(p));
ipcMain.handle('toggle-product-status', (e, data) => productController.toggleProductStatus(data.id, data.status));
ipcMain.handle('delete-product', (e, id) => productController.deleteProduct(id));

// Sozlamalar & Xodimlar
ipcMain.handle('get-settings', () => settingsController.getSettings());
ipcMain.handle('save-settings', (e, data) => settingsController.saveSettings(data));
ipcMain.handle('get-kitchens', () => settingsController.getKitchens());
ipcMain.handle('save-kitchen', (e, data) => settingsController.saveKitchen(data));
ipcMain.handle('delete-kitchen', (e, id) => settingsController.deleteKitchen(id));

ipcMain.handle('get-system-printers', async () => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length === 0) return [];
    const printers = await wins[0].webContents.getPrintersAsync();
    return printers;
});

ipcMain.handle('backup-db', () => settingsController.backupDB());

ipcMain.handle('get-users', () => staffController.getUsers());
ipcMain.handle('save-user', (e, user) => staffController.saveUser(user));
ipcMain.handle('delete-user', (e, id) => staffController.deleteUser(id));
ipcMain.handle('login', (e, pin) => staffController.login(pin));

// Kassa & Xisobot
ipcMain.handle('get-table-items', (e, id) => orderController.getTableItems(id));
ipcMain.handle('checkout', (e, data) => orderController.checkout(data));
ipcMain.handle('get-sales', (e, range) => {
  if (range && range.startDate && range.endDate) {
      return orderController.getSales(range.startDate, range.endDate);
  }
  return orderController.getSales();
});

// --- SMS HANDLERS ---
ipcMain.handle('sms-get-settings', () => smsController.getSettings()); // Email olish
ipcMain.handle('sms-save-settings', (e, data) => smsController.saveSettings(data));
ipcMain.handle('sms-get-templates', () => smsController.getTemplates());
ipcMain.handle('sms-update-template', (e, data) => smsController.updateTemplate(data.type, data.template));
ipcMain.handle('sms-send-broadcast', (e, message) => smsController.sendBroadcast(message));
ipcMain.handle('sms-get-history', () => smsController.getHistory());

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { 
    log.info("Dastur yopildi.");
    if (process.platform !== 'darwin') app.quit(); 
});