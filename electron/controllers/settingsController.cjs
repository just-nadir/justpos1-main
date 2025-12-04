const { db, notify } = require('../database.cjs');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

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
      // O'chirilgan oshxonaga bog'langan ovqatlarning destinationini bo'shatamiz
      db.prepare("UPDATE products SET destination = NULL WHERE destination = ?").run(String(id));
      const res = db.prepare('DELETE FROM kitchens WHERE id = ?').run(id);
      notify('kitchens', null);
      return res;
  },

  // YANGI: Backup funksiyasi
  backupDB: () => {
      try {
          const dbPath = path.join(app.getAppPath(), 'pos.db');
          const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const backupName = `pos_backup_${dateStr}.db`;
          
          // Documents papkasiga saqlaymiz
          const backupPath = path.join(app.getPath('documents'), 'POS_Backups', backupName);
          const backupDir = path.dirname(backupPath);

          if (!fs.existsSync(backupDir)) {
              fs.mkdirSync(backupDir, { recursive: true });
          }

          // SQLite xavfsiz nusxalash (vacuum into) yoki oddiy copy
          // Oddiy copy ishlashi uchun WAL rejimida checkpoint qilish tavsiya etiladi,
          // lekin oddiy copy ham kichik proyektlar uchun yetarli.
          // Yaxshiroq variant: db.backup()
          
          db.backup(backupPath)
            .then(() => {
                console.log('Backup successful:', backupPath);
            })
            .catch((err) => {
                console.error('Backup failed:', err);
                throw err;
            });

          return { success: true, path: backupPath };
      } catch (err) {
          console.error(err);
          throw new Error("Backup qilib bo'lmadi: " + err.message);
      }
  }
};