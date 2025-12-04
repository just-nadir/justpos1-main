const { db, notify } = require('../database.cjs');
const printerService = require('../services/printerService.cjs');
const log = require('electron-log');

// Yordamchi: Check raqamini olish
function getOrCreateCheckNumber(tableId) {
    const table = db.prepare('SELECT current_check_number FROM tables WHERE id = ?').get(tableId);
    if (table && table.current_check_number > 0) return table.current_check_number;

    const nextNumObj = db.prepare("SELECT value FROM settings WHERE key = 'next_check_number'").get();
    let nextNum = nextNumObj ? parseInt(nextNumObj.value) : 1;

    db.prepare("UPDATE settings SET value = ? WHERE key = 'next_check_number'").run(String(nextNum + 1));
    db.prepare("UPDATE tables SET current_check_number = ? WHERE id = ?").run(nextNum, tableId);

    return nextNum;
}

module.exports = {
  getTableItems: (id) => db.prepare('SELECT * FROM order_items WHERE table_id = ?').all(id),

  // 1. Desktopdan qo'shish (Admin/Kassir)
  addItem: (data) => {
    try {
        let checkNumber = 0;
        const addItemTransaction = db.transaction((item) => {
           const { tableId, productName, price, quantity, destination } = item;
           checkNumber = getOrCreateCheckNumber(tableId);

           db.prepare(`INSERT INTO order_items (table_id, product_name, price, quantity, destination) VALUES (?, ?, ?, ?, ?)`).run(tableId, productName, price, quantity, destination);
           
           const currentTable = db.prepare('SELECT total_amount, waiter_name FROM tables WHERE id = ?').get(tableId);
           const newTotal = (currentTable ? currentTable.total_amount : 0) + (price * quantity);
           
           let waiterName = currentTable.waiter_name;
           if (!waiterName || waiterName === 'Noma\'lum') {
               waiterName = 'Kassir';
           }

           db.prepare(`UPDATE tables SET status = 'occupied', total_amount = ?, start_time = COALESCE(start_time, ?), waiter_name = ? WHERE id = ?`)
             .run(newTotal, new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), waiterName, tableId);
        });

        const res = addItemTransaction(data);
        notify('tables', null);
        notify('table-items', data.tableId);
        return res;
    } catch (err) {
        log.error("addItem xatosi:", err);
        throw err;
    }
  },

  // 2. MOBIL OFITSIANT
  addBulkItems: (tableId, items, waiterId) => {
    try {
        let checkNumber = 0;
        let waiterName = "Noma'lum";

        if (waiterId) {
            const user = db.prepare('SELECT name FROM users WHERE id = ?').get(waiterId);
            if (user) {
                waiterName = user.name;
            }
        }

        const addBulkTransaction = db.transaction((itemsList) => {
           checkNumber = getOrCreateCheckNumber(tableId);

           let additionalTotal = 0;
           const insertStmt = db.prepare(`INSERT INTO order_items (table_id, product_name, price, quantity, destination) VALUES (?, ?, ?, ?, ?)`);

           for (const item of itemsList) {
               insertStmt.run(tableId, item.name, item.price, item.qty, item.destination);
               additionalTotal += (item.price * item.qty);
           }
           
           const currentTable = db.prepare('SELECT total_amount, waiter_id, waiter_name, status FROM tables WHERE id = ?').get(tableId);
           const newTotal = (currentTable ? currentTable.total_amount : 0) + additionalTotal;
           const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

           const isOrphan = !currentTable.waiter_id || currentTable.waiter_id === 0;
           const isUnknown = currentTable.waiter_name === "Noma'lum" || currentTable.waiter_name === "Kassir";
           const isFree = currentTable.status === 'free';

           if (isFree || isOrphan || isUnknown) {
               db.prepare(`UPDATE tables SET status = 'occupied', total_amount = ?, start_time = COALESCE(start_time, ?), waiter_id = ?, waiter_name = ? WHERE id = ?`)
                 .run(newTotal, time, waiterId, waiterName, tableId);
           } else {
               db.prepare(`UPDATE tables SET total_amount = ? WHERE id = ?`)
                 .run(newTotal, tableId);
           }
        });

        const res = addBulkTransaction(items);
        notify('tables', null);
        notify('table-items', tableId);

        // Printerga yuborish
        setTimeout(async () => {
            try {
                const freshTable = db.prepare('SELECT name, waiter_name FROM tables WHERE id = ?').get(tableId);
                const tableName = freshTable ? freshTable.name : "Stol";
                const nameToPrint = (waiterName && waiterName !== "Noma'lum") ? waiterName : (freshTable.waiter_name || "Kassir");

                await printerService.printKitchenTicket(items, tableName, checkNumber, nameToPrint);
            } catch (printErr) {
                log.error("Oshxona printeri xatosi:", printErr);
                // YANGI: Xatoni frontendga yuborish
                notify('printer-error', `Oshxona printeri: ${printErr.message}`);
            }
        }, 100);
        return res;
    } catch (err) {
        log.error("addBulkItems xatosi:", err);
        throw err;
    }
  },

  // 3. Checkout (To'lov)
  checkout: async (data) => {
    const { tableId, total, subtotal, discount, paymentMethod, customerId, items } = data;
    const date = new Date().toISOString();
    
    try {
        let checkNumber = 0;
        let waiterName = "";
        let guestCount = 0;

        const performCheckout = db.transaction(() => {
          const table = db.prepare('SELECT current_check_number, waiter_name, guests FROM tables WHERE id = ?').get(tableId);
          checkNumber = table ? table.current_check_number : 0;
          waiterName = table ? table.waiter_name : "Kassir";
          guestCount = table ? table.guests : 0;

          db.prepare(`INSERT INTO sales (date, total_amount, subtotal, discount, payment_method, customer_id, items_json, check_number, waiter_name, guest_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(date, total, subtotal, discount, paymentMethod, customerId, JSON.stringify(items), checkNumber, waiterName, guestCount);
          
          if (paymentMethod === 'debt' && customerId) {
             db.prepare('UPDATE customers SET debt = debt + ? WHERE id = ?').run(total, customerId);
             db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, total, 'debt', date, `Savdo #${checkNumber} (${waiterName})`);
          }
          
          db.prepare('DELETE FROM order_items WHERE table_id = ?').run(tableId);
          db.prepare("UPDATE tables SET status = 'free', guests = 0, start_time = NULL, total_amount = 0, current_check_number = 0, waiter_id = 0, waiter_name = NULL WHERE id = ?").run(tableId);
        });

        const res = performCheckout();
        
        notify('tables', null);
        notify('sales', null);
        if(customerId) notify('customers', null);

        // Kassa cheki
        setTimeout(async () => {
            try {
                const tableName = db.prepare('SELECT name FROM tables WHERE id = ?').get(tableId)?.name || "Stol";
                const service = total - (subtotal - discount);

                await printerService.printOrderReceipt({
                    checkNumber,
                    tableName,
                    waiterName, 
                    items,
                    subtotal,
                    total,
                    discount,
                    service,
                    paymentMethod,
                });
            } catch (err) {
                log.error("Kassa printeri xatosi:", err);
                // YANGI: Xatoni frontendga yuborish
                notify('printer-error', `Kassa printeri: ${err.message}`);
            }
        }, 100);
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