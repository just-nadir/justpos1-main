const { db, notify } = require('../database.cjs');
const printerService = require('../services/printerService.cjs'); // Printer xizmatini ulaymiz
const log = require('electron-log');

module.exports = {
  getTableItems: (id) => db.prepare('SELECT * FROM order_items WHERE table_id = ?').all(id),

  // Yagona mahsulot qo'shish (Desktop uchun)
  addItem: (data) => {
    try {
        const addItemTransaction = db.transaction((item) => {
           const { tableId, productName, price, quantity, destination } = item;
           db.prepare(`INSERT INTO order_items (table_id, product_name, price, quantity, destination) VALUES (?, ?, ?, ?, ?)`).run(tableId, productName, price, quantity, destination);
           
           const currentTable = db.prepare('SELECT total_amount FROM tables WHERE id = ?').get(tableId);
           const newTotal = (currentTable ? currentTable.total_amount : 0) + (price * quantity);
           
           db.prepare(`UPDATE tables SET status = 'occupied', total_amount = ?, start_time = COALESCE(start_time, ?) WHERE id = ?`)
             .run(newTotal, new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), tableId);
        });

        const res = addItemTransaction(data);
        notify('tables', null);
        notify('table-items', data.tableId);
        
        // Agar Desktopdan ham darhol oshxonaga chek chiqarish kerak bo'lsa:
        // const tableName = db.prepare('SELECT name FROM tables WHERE id = ?').get(data.tableId)?.name || "Stol";
        // printerService.printKitchenTicket([data], tableName).catch(e => log.error("Printer error:", e));

        return res;
    } catch (err) {
        log.error("addItem xatosi:", err);
        throw err;
    }
  },

  // Ko'p mahsulot qo'shish (Mobil Ofitsiant uchun)
  addBulkItems: (tableId, items) => {
    try {
        const addBulkTransaction = db.transaction((itemsList) => {
           let additionalTotal = 0;
           const insertStmt = db.prepare(`INSERT INTO order_items (table_id, product_name, price, quantity, destination) VALUES (?, ?, ?, ?, ?)`);

           for (const item of itemsList) {
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

        // --- YANGI: Oshxonaga chek yuborish ---
        // Bu jarayon asinxron bo'ladi, ya'ni ofitsiantni kutdirib o'tirmaymiz
        setTimeout(async () => {
            try {
                const tableName = db.prepare('SELECT name FROM tables WHERE id = ?').get(tableId)?.name || "Noma'lum stol";
                await printerService.printKitchenTicket(items, tableName);
                log.info(`Printer: ${tableName} uchun oshxonaga buyurtma yuborildi.`);
            } catch (printErr) {
                log.error("Oshxona printeri xatosi:", printErr);
            }
        }, 100);
        // --------------------------------------

        return res;
    } catch (err) {
        log.error("addBulkItems xatosi:", err);
        throw err;
    }
  },

  // Hisobni yopish (Checkout)
  checkout: async (data) => {
    const { tableId, total, subtotal, discount, paymentMethod, customerId, items } = data;
    const date = new Date().toISOString();
    
    try {
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
        
        log.info(`SAVDO: Stol ID: ${tableId}, Jami: ${total}, To'lov: ${paymentMethod}`);
        notify('tables', null);
        notify('sales', null);
        if(customerId) notify('customers', null);

        // --- YANGI: Kassa chekini chiqarish ---
        setTimeout(async () => {
            try {
                const tableName = db.prepare('SELECT name FROM tables WHERE id = ?').get(tableId)?.name || "Stol";
                const service = total - (subtotal - discount);

                await printerService.printOrderReceipt({
                    tableName,
                    items,
                    subtotal,
                    total,
                    discount,
                    service,
                    paymentMethod,
                });
                log.info(`Printer: ${tableName} uchun kassa cheki chiqarildi.`);
            } catch (err) {
                log.error("Kassa printeri xatosi:", err);
            }
        }, 100);
        // --------------------------------------

        return res;
    } catch (err) {
        log.error("Checkout xatosi:", err);
        throw err;
    }
  },
  
  getSales: (startDate, endDate) => {
    if (!startDate || !endDate) return db.prepare('SELECT * FROM sales ORDER BY date DESC LIMIT 100').all();
    return db.prepare('SELECT * FROM sales WHERE date >= ? AND date <= ? ORDER BY date DESC').all(startDate, endDate);
  }
};