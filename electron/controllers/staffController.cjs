const { db, notify } = require('../database.cjs');
const log = require('electron-log');
const crypto = require('crypto');

// Yordamchi: Hashlash funksiyasi
function hashPIN(pin, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

module.exports = {
  getUsers: () => db.prepare('SELECT id, name, role FROM users').all(), // PINni qaytarmaymiz (xavfsizlik)

  saveUser: (user) => {
    // PIN kod validatsiyasi (faqat raqamlar)
    if (user.pin && !/^\d+$/.test(user.pin)) {
        throw new Error("PIN faqat raqamlardan iborat bo'lishi kerak!");
    }

    if (user.id) {
      // Userni yangilash
      if (user.pin) { // Agar yangi PIN kiritilgan bo'lsa
         const { salt, hash } = hashPIN(user.pin);
         db.prepare('UPDATE users SET name = ?, pin = ?, role = ?, salt = ? WHERE id = ?')
           .run(user.name, hash, user.role, salt, user.id);
      } else { // Faqat ism yoki rolni o'zgartirish
         db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?')
           .run(user.name, user.role, user.id);
      }
      log.info(`XODIM: ${user.name} (${user.role}) ma'lumotlari o'zgartirildi.`);
    } else {
      // Yangi user qo'shish
      // Unikal PIN tekshiruvi (murakkabroq, chunki endi hashlar har xil)
      // Lekin biz ism va rol bo'yicha tekshirishimiz mumkin yoki shunchaki PIN to'qnashuviga (collision) ishonamiz (juda kam ehtimol).
      // Yoki barcha userlarni olib tekshiramiz (kichik baza uchun OK).
      
      const allUsers = db.prepare('SELECT pin, salt FROM users').all();
      const isDuplicate = allUsers.some(u => {
          const { hash } = hashPIN(user.pin, u.salt);
          return hash === u.pin;
      });

      if (isDuplicate) throw new Error('Bu PIN kod band!');
      
      const { salt, hash } = hashPIN(user.pin);
      db.prepare('INSERT INTO users (name, pin, role, salt) VALUES (?, ?, ?, ?)')
        .run(user.name, hash, user.role, salt);
      
      log.info(`XODIM: Yangi xodim qo'shildi: ${user.name} (${user.role})`);
    }
    notify('users', null);
  },

  deleteUser: (id) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (user && user.role === 'admin') {
       const adminCount = db.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").get().count;
       if (adminCount <= 1) throw new Error("Oxirgi adminni o'chirib bo'lmaydi!");
    }
    
    const res = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    log.warn(`XODIM: Xodim o'chirildi. ID: ${id}, Ism: ${user?.name}`);
    notify('users', null);
    return res;
  },

  login: (pin) => {
    // Barcha userlarni olamiz va tekshiramiz (chunki bizda salt userga bog'liq)
    const users = db.prepare('SELECT * FROM users').all();
    
    const foundUser = users.find(u => {
        // Agar eski formatda (salt yo'q) bo'lsa, to'g'ridan-to'g'ri tekshir (migratsiya tugaguncha ehtiyot shart)
        if (!u.salt) return u.pin === pin;
        
        // Hashlab ko'ramiz
        const { hash } = hashPIN(pin, u.salt);
        return hash === u.pin;
    });

    if (!foundUser) {
        log.warn(`LOGIN: Noto'g'ri PIN kod bilan kirishga urinish.`);
        throw new Error("Noto'g'ri PIN kod");
    }
    
    log.info(`LOGIN: ${foundUser.name} (${foundUser.role}) tizimga kirdi.`);
    // Clientga PIN va Saltni yubormaymiz
    return { id: foundUser.id, name: foundUser.name, role: foundUser.role };
  }
};