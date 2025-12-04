const { db, notify } = require('../database.cjs');
const log = require('electron-log'); // Log

module.exports = {
  getUsers: () => db.prepare('SELECT * FROM users').all(),

  saveUser: (user) => {
    if (user.id) {
      db.prepare('UPDATE users SET name = ?, pin = ?, role = ? WHERE id = ?')
        .run(user.name, user.pin, user.role, user.id);
      log.info(`XODIM: ${user.name} (${user.role}) ma'lumotlari o'zgartirildi.`);
    } else {
      const exists = db.prepare('SELECT id FROM users WHERE pin = ?').get(user.pin);
      if (exists) throw new Error('Bu PIN kod band!');
      
      db.prepare('INSERT INTO users (name, pin, role) VALUES (?, ?, ?)')
        .run(user.name, user.pin, user.role);
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
    const user = db.prepare('SELECT * FROM users WHERE pin = ?').get(pin);
    if (!user) {
        log.warn(`LOGIN: Noto'g'ri PIN kod bilan kirishga urinish.`);
        throw new Error("Noto'g'ri PIN kod");
    }
    log.info(`LOGIN: ${user.name} (${user.role}) tizimga kirdi.`);
    return user;
  }
};