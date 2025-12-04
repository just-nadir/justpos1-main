const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto'); // Shifrlash uchun

const dbPath = path.join(app.getAppPath(), 'pos.db');
const db = new Database(dbPath, { verbose: console.log });

db.pragma('journal_mode = WAL');

const listeners = [];

function onChange(callback) {
  listeners.push(callback);
}

function notify(event, data) {
  listeners.forEach(cb => cb(event, data));
}

// --- YORDAMCHI: Xavfsizlik funksiyalari (PIN Hashlash) ---
function hashPIN(pin, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

// --- JADVALLARNI YARATISH ---
function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS halls (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      hall_id INTEGER, 
      name TEXT NOT NULL, 
      status TEXT DEFAULT 'free', 
      guests INTEGER DEFAULT 0, 
      start_time TEXT, 
      total_amount REAL DEFAULT 0, 
      current_check_number INTEGER DEFAULT 0,
      waiter_id INTEGER DEFAULT 0,
      waiter_name TEXT,
      FOREIGN KEY(hall_id) REFERENCES halls(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      name TEXT NOT NULL, 
      phone TEXT, 
      type TEXT DEFAULT 'standard', 
      value INTEGER DEFAULT 0, 
      balance REAL DEFAULT 0, 
      birthday TEXT, 
      debt REAL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS debt_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      customer_id INTEGER, 
      amount REAL, 
      type TEXT, 
      date TEXT, 
      comment TEXT, 
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      destination TEXT, 
      is_active INTEGER DEFAULT 1,
      image TEXT,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      table_id INTEGER, 
      product_name TEXT, 
      price REAL, 
      quantity INTEGER, 
      destination TEXT, 
      FOREIGN KEY(table_id) REFERENCES tables(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      date TEXT, 
      total_amount REAL, 
      subtotal REAL, 
      discount REAL, 
      payment_method TEXT, 
      customer_id INTEGER, 
      items_json TEXT, 
      check_number INTEGER DEFAULT 0,
      waiter_name TEXT,
      guest_count INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
    `CREATE TABLE IF NOT EXISTS kitchens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      printer_ip TEXT,       
      printer_port INTEGER DEFAULT 9100,
      printer_type TEXT DEFAULT 'driver'
    )`,
    // Users jadvali (salt ustuni qo'shiladi keyinroq migratsiyada)
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'waiter',
      salt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS sms_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT UNIQUE, 
      template TEXT,
      is_active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS sms_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT,
      message TEXT,
      status TEXT, 
      date TEXT,
      type TEXT 
    )`
  ];

  tables.forEach(sql => db.exec(sql));
}

// --- MIGRATSIYA VA MA'LUMOTLARNI YANGILASH ---
function runMigrations() {
  try {
    // 1. Users jadvaliga 'salt' ustunini qo'shish (agar bo'lmasa)
    const userCols = db.prepare(`PRAGMA table_info(users)`).all();
    if (!userCols.some(c => c.name === 'salt')) {
      console.log("Migratsiya: Users jadvaliga 'salt' ustuni qo'shilmoqda...");
      db.prepare(`ALTER TABLE users ADD COLUMN salt TEXT`).run();
    }

    // 2. Kitchens jadvali (printer_type)
    const kitchenCols = db.prepare(`PRAGMA table_info(kitchens)`).all();
    if (!kitchenCols.some(c => c.name === 'printer_type')) {
      db.prepare(`ALTER TABLE kitchens ADD COLUMN printer_type TEXT DEFAULT 'lan'`).run();
    }

    // 3. Boshqa ustunlar (oldingi koddan)
    const salesCols = db.prepare(`PRAGMA table_info(sales)`).all();
    if (!salesCols.some(c => c.name === 'check_number')) db.prepare(`ALTER TABLE sales ADD COLUMN check_number INTEGER DEFAULT 0`).run();
    if (!salesCols.some(c => c.name === 'waiter_name')) db.prepare(`ALTER TABLE sales ADD COLUMN waiter_name TEXT`).run();
    if (!salesCols.some(c => c.name === 'guest_count')) db.prepare(`ALTER TABLE sales ADD COLUMN guest_count INTEGER DEFAULT 0`).run();

    const tablesCols = db.prepare(`PRAGMA table_info(tables)`).all();
    if (!tablesCols.some(c => c.name === 'current_check_number')) db.prepare(`ALTER TABLE tables ADD COLUMN current_check_number INTEGER DEFAULT 0`).run();
    if (!tablesCols.some(c => c.name === 'waiter_id')) db.prepare(`ALTER TABLE tables ADD COLUMN waiter_id INTEGER DEFAULT 0`).run();
    if (!tablesCols.some(c => c.name === 'waiter_name')) db.prepare(`ALTER TABLE tables ADD COLUMN waiter_name TEXT`).run();

  } catch (err) {
    console.error("Migratsiya xatosi:", err);
  }
}

// --- SEEDING (Boshlang'ich ma'lumotlar) ---
function seedDatabase() {
  // 1. SMS Shablonlar
  const templateCount = db.prepare('SELECT count(*) as count FROM sms_templates').get().count;
  if (templateCount === 0) {
    const insertTmpl = db.prepare('INSERT INTO sms_templates (type, template) VALUES (?, ?)');
    insertTmpl.run('birthday', "Hurmatli {name}! Restoranimiz sizni tug'ilgan kuningiz bilan tabriklaydi! Sizga sog'lik va baxt tilaymiz.");
    insertTmpl.run('debt', "Hurmatli {name}, sizning hisobingizda {amount} so'm qarzdorlik mavjud. Iltimos, to'lovni amalga oshiring.");
    insertTmpl.run('news', "Yangi taom! Bizning menyumizda {dish_name} paydo bo'ldi. Tatib ko'rishga taklif qilamiz!");
  }

  // 2. Default Admin (Agar yo'q bo'lsa) - Hashlangan holda
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount === 0) {
    const { salt, hash } = hashPIN('1111');
    db.prepare("INSERT INTO users (name, pin, role, salt) VALUES ('Admin', ?, 'admin', ?)").run(hash, salt);
    console.log("Default Admin yaratildi (PIN: 1111)");
  }

  // 3. Default Zallar va Mahsulotlar
  const hallCount = db.prepare('SELECT count(*) as count FROM halls').get().count;
  if (hallCount === 0) {
    const hall1 = db.prepare("INSERT INTO halls (name) VALUES ('Asosiy Zal')").run().lastInsertRowid;
    db.prepare("INSERT INTO tables (hall_id, name) VALUES (?, 'Stol 1')").run(hall1);
    db.prepare("INSERT INTO categories (name) VALUES ('Taomlar')").run();
    db.prepare("INSERT INTO products (category_id, name, price, destination) VALUES (1, 'Osh', 65000, '1')").run();
  }

  // 4. PIN Kodlarni shifrlash (Eski userlar uchun migratsiya)
  const users = db.prepare("SELECT * FROM users WHERE salt IS NULL").all();
  if (users.length > 0) {
    console.log(`Xavfsizlik: ${users.length} ta xodimning paroli shifrlanmoqda...`);
    const updateStmt = db.prepare("UPDATE users SET pin = ?, salt = ? WHERE id = ?");
    for (const user of users) {
      // Agar pin allaqachon uzun bo'lsa (hashlangan), tegmaymiz (xavfsizlik uchun)
      if (user.pin.length < 20) {
        const { salt, hash } = hashPIN(user.pin);
        updateStmt.run(hash, salt, user.id);
      }
    }
    console.log("Xavfsizlik: Barcha parollar muvaffaqiyatli shifrlandi.");
  }
}

function initDB() {
  createTables();
  runMigrations();
  seedDatabase();
  
  // Sozlamalar: Check raqami
  const checkNumSet = db.prepare("SELECT value FROM settings WHERE key = 'next_check_number'").get();
  if (!checkNumSet) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('next_check_number', '1')").run();
  }
}

module.exports = { db, initDB, onChange, notify };