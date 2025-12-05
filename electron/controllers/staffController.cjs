const { db, notify } = require('../database.cjs');
const log = require('electron-log');
const crypto = require('crypto'); // Hashlash uchun kerak

module.exports = {
  getUsers: () => db.prepare('SELECT * FROM users').all(),

  saveUser: (user) => {
    // Agar yangi user bo'lsa yoki pin o'zgargan bo'lsa, uni hashlash kerak
    // Hozircha oddiylik uchun har doim yangilaymiz, lekin real loyihada faqat o'zgarganda qilish kerak.
    
    // Hashlash funksiyasi
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(user.pin, salt, 1000, 64, 'sha512').toString('hex');

    if (user.id) {
      // Agar user bor bo'lsa, PIN o'zgargan bo'lishi mumkin. 
      // Eslatma: Hozirgi interfeysda PIN ko'rinmaydi, shuning uchun PIN har doim yangidan kiritiladi deb hisoblaymiz.
      db.prepare('UPDATE users SET name = ?, pin = ?, role = ?, salt = ? WHERE id = ?')
        .run(user.name, hash, user.role, salt, user.id);
      log.info(`XODIM: ${user.name} (${user.role}) ma'lumotlari yangilandi.`);
    } else {
      // PIN band emasligini tekshirish qiyin chunki hammasi hashda. 
      // Shuning uchun barcha userlarni olib tekshiramiz (kichik loyiha uchun OK)
      const users = db.prepare('SELECT * FROM users').all();
      const isPinTaken = users.some(u => {
          if(u.salt) {
             const checkHash = crypto.pbkdf2Sync(user.pin, u.salt, 1000, 64, 'sha512').toString('hex');
             return checkHash === u.pin;
          }
          return u.pin === user.pin;
      });

      if (isPinTaken) throw new Error('Bu PIN kod band!');
      
      db.prepare('INSERT INTO users (name, pin, role, salt) VALUES (?, ?, ?, ?)')
        .run(user.name, hash, user.role, salt);
      log.info(`XODIM: Yangi xodim qo'shildi: ${user.name}`);
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
    log.warn(`XODIM: Xodim o'chirildi. ID: ${id}`);
    notify('users', null);
    return res;
  },

  login: (pinInput) => {
    // 1. Barcha userlarni olamiz
    const users = db.prepare('SELECT * FROM users').all();

    // 2. Har bir userni tekshiramiz
    const foundUser = users.find(user => {
        // Agar userda 'salt' bo'lsa (yangi tizim)
        if (user.salt) {
            const hashToCheck = crypto.pbkdf2Sync(pinInput, user.salt, 1000, 64, 'sha512').toString('hex');
            return hashToCheck === user.pin;
        }
        // Agar 'salt' bo'lmasa (eski yoki xato ma'lumot) - oddiy solishtirish
        return user.pin === pinInput;
    });

    if (!foundUser) {
        log.warn(`LOGIN: Noto'g'ri PIN kod kiritildi.`);
        throw new Error("PIN kod noto'g'ri!");
    }

    log.info(`LOGIN: ${foundUser.name} (${foundUser.role}) tizimga kirdi.`);
    return foundUser;
  }
};