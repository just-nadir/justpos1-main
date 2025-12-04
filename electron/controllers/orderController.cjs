const { db, notify } = require('../database.cjs');
const printerService = require('../services/printerService.cjs');
const log = require('electron-log');

// Yordamchi funksiya: Stol uchun Chek Raqamini olish yoki yaratish
function getOrCreateCheckNumber(tableId) {
    const table = db.prepare('SELECT current_check_number FROM tables WHERE id = ?').get(tableId);
    
    // Agar stolda allaqachon aktiv chek raqami bo'lsa, o'shani qaytar
    if (table && table.current_check_number > 0) {
        return table.current_check_number;
    }

    // Yo'q bo'lsa, yangisini generatsiya qilamiz
    const nextNumObj = db.prepare("SELECT value FROM settings WHERE key = 'next_check_number'").get();
    let nextNum = nextNumObj ? parseInt(nextNumObj.value) : 1;

    // Sozlamalarni yangilaymiz (+1)
    db.prepare("UPDATE settings SET value = ? WHERE key = 'next_check_number'").run(String(nextNum + 1));
    
    // Stolga yozib qo'yamiz
    db.prepare("UPDATE tables SET current_check_number = ? WHERE id = ?").run(nextNum, tableId);

    return nextNum;
}

module.exports = {
  getTableItems: (id) => db.prepare('SELECT * FROM order_items WHERE table_id = ?').all(id),

  // Yagona mahsulot qo'shish (Desktop)
  addItem: (data) => {
    try {
        let checkNumber = 0;
        const addItemTransaction = db.transaction((item) => {
           const { tableId, productName, price, quantity, destination } = item;
           
           // Chek raqamini aniqlash (Tranzaksiya ichida bo'lishi shart)
           checkNumber = getOrCreateCheckNumber(tableId);

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
    } catch (err) {
        log.error("addItem xatosi:", err);
        throw err;
    }
  },

  // Ko'p mahsulot qo'shish (Mobil)
  addBulkItems: (tableId, items) => {
    try {
        let checkNumber = 0;
        const addBulkTransaction = db.transaction((itemsList) => {
           // Chek raqamini aniqlash
           checkNumber = getOrCreateCheckNumber(tableId);

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

        // Oshxonaga chek yuborish (Check Number bilan)
        setTimeout(async () => {
            try {
                const tableName = db.prepare('SELECT name FROM tables WHERE id = ?').get(tableId)?.name || "Noma'lum";
                // checkNumber ni 3-argument sifatida beramiz
                await printerService.printKitchenTicket(items, tableName, checkNumber);
                log.info(`Printer: Buyurtma №${checkNumber} oshxonaga yuborildi.`);
            } catch (printErr) {
                log.error("Oshxona printeri xatosi:", printErr);
            }
        }, 100);

        return res;
    } catch (err) {
        log.error("addBulkItems xatosi:", err);
        throw err;
    }
  },

  // Checkout (To'lov)
  checkout: async (data) => {
    const { tableId, total, subtotal, discount, paymentMethod, customerId, items } = data;
    const date = new Date().toISOString();
    
    try {
        let checkNumber = 0;

        const performCheckout = db.transaction(() => {
          // Chek raqamini olamiz (yopilishidan oldin)
          const table = db.prepare('SELECT current_check_number FROM tables WHERE id = ?').get(tableId);
          checkNumber = table ? table.current_check_number : 0;

          // Sales ga check_number ni ham yozamiz
          db.prepare(`INSERT INTO sales (date, total_amount, subtotal, discount, payment_method, customer_id, items_json, check_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(date, total, subtotal, discount, paymentMethod, customerId, JSON.stringify(items), checkNumber);
          
          if (paymentMethod === 'debt' && customerId) {
            db.prepare('UPDATE customers SET debt = debt + ? WHERE id = ?').run(total, customerId);
            db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, total, 'debt', date, `Savdo (Chek №${checkNumber})`);
          }
          
          db.prepare('DELETE FROM order_items WHERE table_id = ?').run(tableId);
          // Stolni bo'shatganda current_check_number ni 0 qilamiz
          db.prepare("UPDATE tables SET status = 'free', guests = 0, start_time = NULL, total_amount = 0, current_check_number = 0 WHERE id = ?").run(tableId);
        });

        const res = performCheckout();
        
        log.info(`SAVDO: Stol ID: ${tableId}, Chek: #${checkNumber}, Jami: ${total}`);
        notify('tables', null);
        notify('sales', null);
        if(customerId) notify('customers', null);

        // Kassa chekini chiqarish
        setTimeout(async () => {
            try {
                const tableName = db.prepare('SELECT name FROM tables WHERE id = ?').get(tableId)?.name || "Stol";
                const service = total - (subtotal - discount);

                await printerService.printOrderReceipt({
                    checkNumber, // Yangi argument
                    tableName,
                    items,
                    subtotal,
                    total,
                    discount,
                    service,
                    paymentMethod,
                });
                log.info(`Printer: Chek #${checkNumber} chiqarildi.`);
            } catch (err) {
                log.error("Kassa printeri xatosi:", err);
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