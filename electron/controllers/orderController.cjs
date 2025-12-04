const { db, notify } = require('../database.cjs');
const printerService = require('../services/printerService.cjs');
const log = require('electron-log'); // Log

module.exports = {
  getTableItems: (id) => db.prepare('SELECT * FROM order_items WHERE table_id = ?').all(id),

  addItem: (data) => {
    const addItemTransaction = db.transaction((item) => {
       const { tableId, productId, productName, price, quantity, destination } = item;
       db.prepare(`INSERT INTO order_items (table_id, product_name, price, quantity, destination) VALUES (?, ?, ?, ?, ?)`).run(tableId, productName, price, quantity, destination);
       const currentTable = db.prepare('SELECT total_amount FROM tables WHERE id = ?').get(tableId);
       const newTotal = (currentTable ? currentTable.total_amount : 0) + (price * quantity);
       db.prepare(`UPDATE tables SET status = 'occupied', total_amount = ?, start_time = COALESCE(start_time, ?) WHERE id = ?`)
         .run(newTotal, new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), tableId);
    });
    const res = addItemTransaction(data);
    notify('tables', null);
    notify('table-items', data.tableId);
    return res;
  },

  addBulkItems: (tableId, items) => {
    const addBulkTransaction = db.transaction((items) => {
       let additionalTotal = 0;
       const insertStmt = db.prepare(`INSERT INTO order_items (table_id, product_name, price, quantity, destination) VALUES (?, ?, ?, ?, ?)`);

       for (const item of items) {
           insertStmt.run(tableId, item.name, item.price, item.qty, item.destination);
           additionalTotal += (item.price * item.qty);
       }
       
       const currentTable = db.prepare('SELECT total_amount FROM tables WHERE id = ?').get(tableId);
       const newTotal = (currentTable ? currentTable.total_amount : 0) + additionalTotal;
       
       db.prepare(`UPDATE tables SET status = 'occupied', total_amount = ?, start_time = COALESCE(start_time, ?) WHERE id = ?`)
         .run(newTotal, new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), tableId);
    });

    const res = addBulkTransaction(items);
    notify('tables', null);
    notify('table-items', tableId);
    return res;
  },

  checkout: async (data) => {
    const { tableId, total, subtotal, discount, paymentMethod, customerId, items } = data;
    const date = new Date().toISOString();
    
    // Tranzaksiya
    const performCheckout = db.transaction(() => {
      db.prepare(`INSERT INTO sales (date, total_amount, subtotal, discount, payment_method, customer_id, items_json) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(date, total, subtotal, discount, paymentMethod, customerId, JSON.stringify(items));
      
      if (paymentMethod === 'debt' && customerId) {
        db.prepare('UPDATE customers SET debt = debt + ? WHERE id = ?').run(total, customerId);
        db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, total, 'debt', date, 'Savdo (Nasiya)');
      }
      
      db.prepare('DELETE FROM order_items WHERE table_id = ?').run(tableId);
      db.prepare("UPDATE tables SET status = 'free', guests = 0, start_time = NULL, total_amount = 0 WHERE id = ?").run(tableId);
    });

    const res = performCheckout();
    
    // LOG YOZISH
    log.info(`SAVDO: Stol ID: ${tableId}, Jami: ${total}, To'lov: ${paymentMethod}, Mijoz ID: ${customerId || 'Yo\'q'}`);

    notify('tables', null);
    notify('sales', null);
    if(customerId) notify('customers', null);

    const tableName = db.prepare('SELECT name FROM tables WHERE id = ?').get(tableId)?.name || "Stol";
    const service = total - (subtotal - discount);

    printerService.printOrderReceipt({
        tableName,
        items,
        subtotal,
        total,
        discount,
        service,
        paymentMethod
    }).catch(err => log.error("Printer xatosi:", err)); // Xatoni logga yozamiz

    return res;
  },
  
  getSales: (startDate, endDate) => {
    if (!startDate || !endDate) return db.prepare('SELECT * FROM sales ORDER BY date DESC LIMIT 100').all();
    return db.prepare('SELECT * FROM sales WHERE date >= ? AND date <= ? ORDER BY date DESC').all(startDate, endDate);
  }
};