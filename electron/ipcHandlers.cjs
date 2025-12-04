const tableController = require('./controllers/tableController.cjs');
const productController = require('./controllers/productController.cjs');
const orderController = require('./controllers/orderController.cjs');
const userController = require('./controllers/userController.cjs');
const settingsController = require('./controllers/settingsController.cjs');
const staffController = require('./controllers/staffController.cjs');
const smsController = require('./controllers/smsController.cjs');

module.exports = function registerIpcHandlers(ipcMain) {
    // --- Zallar & Stollar ---
    ipcMain.handle('get-halls', () => tableController.getHalls());
    ipcMain.handle('add-hall', (e, name) => tableController.addHall(name));
    ipcMain.handle('delete-hall', (e, id) => tableController.deleteHall(id));

    ipcMain.handle('get-tables', () => tableController.getTables());
    ipcMain.handle('get-tables-by-hall', (e, id) => tableController.getTablesByHall(id));
    ipcMain.handle('add-table', (e, data) => tableController.addTable(data.hallId, data.name));
    ipcMain.handle('delete-table', (e, id) => tableController.deleteTable(id));

    ipcMain.handle('update-table-status', (e, data) => tableController.updateTableStatus(data.id, data.status));
    ipcMain.handle('close-table', (e, id) => tableController.closeTable(id));

    // --- Mijozlar & Qarzlar ---
    ipcMain.handle('get-customers', () => userController.getCustomers());
    ipcMain.handle('add-customer', (e, c) => userController.addCustomer(c));
    ipcMain.handle('delete-customer', (e, id) => userController.deleteCustomer(id));
    ipcMain.handle('get-debtors', () => userController.getDebtors());
    ipcMain.handle('get-debt-history', (e, id) => userController.getDebtHistory(id));
    ipcMain.handle('pay-debt', (e, data) => userController.payDebt(data.customerId, data.amount, data.comment));

    // --- Menyu & Mahsulotlar ---
    ipcMain.handle('get-categories', () => productController.getCategories());
    ipcMain.handle('add-category', (e, name) => productController.addCategory(name));

    ipcMain.handle('get-products', () => productController.getProducts());
    ipcMain.handle('add-product', (e, p) => productController.addProduct(p));
    ipcMain.handle('toggle-product-status', (e, data) => productController.toggleProductStatus(data.id, data.status));
    ipcMain.handle('delete-product', (e, id) => productController.deleteProduct(id));

    // --- Sozlamalar & Xodimlar ---
    ipcMain.handle('get-settings', () => settingsController.getSettings());
    ipcMain.handle('save-settings', (e, data) => settingsController.saveSettings(data));
    ipcMain.handle('get-kitchens', () => settingsController.getKitchens());
    ipcMain.handle('save-kitchen', (e, data) => settingsController.saveKitchen(data));
    ipcMain.handle('delete-kitchen', (e, id) => settingsController.deleteKitchen(id));
    
    ipcMain.handle('backup-db', () => settingsController.backupDB());

    ipcMain.handle('get-users', () => staffController.getUsers());
    ipcMain.handle('save-user', (e, user) => staffController.saveUser(user));
    ipcMain.handle('delete-user', (e, id) => staffController.deleteUser(id));
    ipcMain.handle('login', (e, pin) => staffController.login(pin));

    // --- Kassa & Xisobot ---
    ipcMain.handle('get-table-items', (e, id) => orderController.getTableItems(id));
    ipcMain.handle('checkout', (e, data) => orderController.checkout(data));
    ipcMain.handle('get-sales', (e, range) => {
        if (range && range.startDate && range.endDate) {
            return orderController.getSales(range.startDate, range.endDate);
        }
        return orderController.getSales();
    });

    // --- SMS ---
    ipcMain.handle('sms-get-settings', () => smsController.getSettings());
    ipcMain.handle('sms-save-settings', (e, data) => smsController.saveSettings(data));
    ipcMain.handle('sms-get-templates', () => smsController.getTemplates());
    ipcMain.handle('sms-update-template', (e, data) => smsController.updateTemplate(data.type, data.template));
    ipcMain.handle('sms-send-broadcast', (e, message) => smsController.sendBroadcast(message));
    ipcMain.handle('sms-get-history', () => smsController.getHistory());
};