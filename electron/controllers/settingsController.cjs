const { db, notify } = require('../database.cjs');
const eskizService = require('../services/eskizService.cjs'); // Eskiz servisni chaqiramiz
const log = require('electron-log');

module.exports = {
  getSettings: () => {
    const rows = db.prepare('SELECT * FROM settings').all();
    return rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
  },

  saveSettings: (settingsObj) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const saveTransaction = db.transaction((settings) => {
      for (const [key, value] of Object.entries(settings)) stmt.run(key, String(value));
    });
    const res = saveTransaction(settingsObj);
    notify('settings', null);
    return res;
  },

  getKitchens: () => db.prepare('SELECT * FROM kitchens').all(),
  
  saveKitchen: (data) => {
    if (data.id) {
        db.prepare('UPDATE kitchens SET name = ?, printer_ip = ?, printer_port = ? WHERE id = ?')
          .run(data.name, data.printer_ip, data.printer_port || 9100, data.id);
    } else {
        db.prepare('INSERT INTO kitchens (name, printer_ip, printer_port) VALUES (?, ?, ?)')
          .run(data.name, data.printer_ip, data.printer_port || 9100);
    }
    notify('kitchens', null);
  },
  
  deleteKitchen: (id) => {
      db.prepare("UPDATE products SET destination = NULL WHERE destination = ?").run(String(id));
      const res = db.prepare('DELETE FROM kitchens WHERE id = ?').run(id);
      notify('kitchens', null);
      return res;
  },

  // --- YANGI: SMS SHABLONLARI ---
  getSmsTemplates: () => {
      return db.prepare('SELECT * FROM sms_templates').all();
  },

  saveSmsTemplate: (data) => {
      // data: { id, template, is_active }
      const res = db.prepare('UPDATE sms_templates SET template = ?, is_active = ? WHERE id = ?')
        .run(data.template, data.is_active ? 1 : 0, data.id);
      notify('sms-templates', null);
      return res;
  },

  // --- YANGI: OMMAVIY SMS (Yangi taom haqida) ---
  sendMassSms: async (templateId) => {
      try {
          // 1. Shablonni olamiz
          const tplRow = db.prepare('SELECT template FROM sms_templates WHERE id = ?').get(templateId);
          if (!tplRow) throw new Error("Shablon topilmadi");
          
          let template = tplRow.template;

          // 2. Restoran nomini olamiz
          const settings = db.prepare('SELECT value FROM settings WHERE key = "restaurantName"').get();
          const restaurantName = settings ? settings.value : "Bizning Restoran";

          // 3. Barcha mijozlarni olamiz (Telefon raqami borlarni)
          const customers = db.prepare("SELECT name, phone FROM customers WHERE phone IS NOT NULL AND phone != ''").all();
          
          if (customers.length === 0) throw new Error("Mijozlar topilmadi");

          log.info(`OMMAVIY SMS: ${customers.length} ta mijozga yuborilmoqda...`);

          // 4. Har biriga yuboramiz (Sekinlatib, spamga tushmaslik uchun)
          let sentCount = 0;
          for (const customer of customers) {
              // Shablonni to'ldirish
              let message = template
                  .replace(/{name}/g, customer.name)
                  .replace(/{restaurant}/g, restaurantName);
              
              // Agar shablonda {dish_name} qolgan bo'lsa, uni umumiy so'zga almashtiramiz yoki frontenddan olib kelish kerak bo'ladi. 
              // Hozircha oddiyroq yechim: admin shablonni o'zi to'g'irlab yozadi deb hisoblaymiz.
              
              const res = await eskizService.sendSMS(customer.phone, message);
              if (res.success) {
                  sentCount++;
                  // Tarixga yozish
                  db.prepare('INSERT INTO sms_history (phone, message, status, date, type) VALUES (?, ?, ?, ?, ?)')
                    .run(customer.phone, message, 'sent', new Date().toISOString(), 'mass_news');
              }
              // API ni bombardimon qilmaslik uchun kichik pauza
              await new Promise(r => setTimeout(r, 100)); 
          }

          log.info(`OMMAVIY SMS: ${sentCount} ta yuborildi.`);
          return { success: true, sent: sentCount, total: customers.length };

      } catch (err) {
          log.error("Mass SMS Error:", err);
          throw err;
      }
  }
};