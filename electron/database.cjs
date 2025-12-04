const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getAppPath(), 'pos.db');
const db = new Database(dbPath, { verbose: console.log });

// --- WAL REJIMINI YOQISH ---
db.pragma('journal_mode = WAL');

const listeners = [];

function onChange(callback) {
  listeners.push(callback);
}

function notify(event, data) {
  listeners.forEach(cb => cb(event, data));
}

function initDB() {
  db.exec(`CREATE TABLE IF NOT EXISTS halls (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
  
  // Tables jadvali
  db.exec(`CREATE TABLE IF NOT EXISTS tables (id INTEGER PRIMARY KEY AUTOINCREMENT, hall_id INTEGER, name TEXT NOT NULL, status TEXT DEFAULT 'free', guests INTEGER DEFAULT 0, start_time TEXT, total_amount REAL DEFAULT 0, FOREIGN KEY(hall_id) REFERENCES halls(id) ON DELETE CASCADE)`);
  
  db.exec(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, type TEXT DEFAULT 'standard', value INTEGER DEFAULT 0, balance REAL DEFAULT 0, birthday TEXT, debt REAL DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS debt_history (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, amount REAL, type TEXT, date TEXT, comment TEXT, FOREIGN KEY(customer_id) REFERENCES customers(id))`);
  db.exec(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      destination TEXT, 
      is_active INTEGER DEFAULT 1,
      image TEXT,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )
  `);
  
  db.exec(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, table_id INTEGER, product_name TEXT, price REAL, quantity INTEGER, destination TEXT, FOREIGN KEY(table_id) REFERENCES tables(id))`);
  
  // Sales jadvali
  db.exec(`CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, total_amount REAL, subtotal REAL, discount REAL, payment_method TEXT, customer_id INTEGER, items_json TEXT)`);
  
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS kitchens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      printer_ip TEXT,       
      printer_port INTEGER DEFAULT 9100
    )
  `);

  // --- MIGRATSIYA TIZIMI (Yangi ustunlar qo'shish) ---
  try {
    // 1. Kitchens printer_type
    const colsKitchen = db.prepare(`PRAGMA table_info(kitchens)`).all();
    if (!colsKitchen.some(c => c.name === 'printer_type')) {
        db.prepare(`ALTER TABLE kitchens ADD COLUMN printer_type TEXT DEFAULT 'lan'`).run();
        console.log("MIGRATION: 'printer_type' added to kitchens");
    }

    // 2. Tables current_check_number (Joriy stolning chek raqami)
    const colsTables = db.prepare(`PRAGMA table_info(tables)`).all();
    if (!colsTables.some(c => c.name === 'current_check_number')) {
        db.prepare(`ALTER TABLE tables ADD COLUMN current_check_number INTEGER DEFAULT 0`).run();
        console.log("MIGRATION: 'current_check_number' added to tables");
    }

    // 3. Sales check_number (Tarix uchun chek raqami)
    const colsSales = db.prepare(`PRAGMA table_info(sales)`).all();
    if (!colsSales.some(c => c.name === 'check_number')) {
        db.prepare(`ALTER TABLE sales ADD COLUMN check_number INTEGER DEFAULT 0`).run();
        console.log("MIGRATION: 'check_number' added to sales");
    }

  } catch (err) {
    console.error("Migratsiya xatosi:", err);
  }
  // --------------------------------------------------

  // Check raqami hisoblagichini yaratish
  const checkNumSet = db.prepare("SELECT value FROM settings WHERE key = 'next_check_number'").get();
  if (!checkNumSet) {
      db.prepare("INSERT INTO settings (key, value) VALUES ('next_check_number', '1')").run();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'waiter'
    )
  `);

  // Default Data
  const stmtUsers = db.prepare('SELECT count(*) as count FROM users');
  if (stmtUsers.get().count === 0) {
     db.prepare("INSERT INTO users (name, pin, role) VALUES ('Admin', '1111', 'admin')").run();
  }

  const stmtK = db.prepare('SELECT count(*) as count FROM kitchens');
  if (stmtK.get().count === 0) {
     const insertK = db.prepare('INSERT INTO kitchens (name, printer_ip, printer_type) VALUES (?, ?, ?)');
     insertK.run('Oshxona', '192.168.1.200', 'lan');
     insertK.run('Bar', '192.168.1.201', 'lan');
  }
  
  const stmtHalls = db.prepare('SELECT count(*) as count FROM halls');
  if (stmtHalls.get().count === 0) {
    const hall1 = db.prepare("INSERT INTO halls (name) VALUES ('Asosiy Zal')").run().lastInsertRowid;
    db.prepare("INSERT INTO tables (hall_id, name) VALUES (?, 'Stol 1')").run(hall1);
    db.prepare("INSERT INTO categories (name) VALUES ('Taomlar')").run();
    db.prepare("INSERT INTO products (category_id, name, price, destination) VALUES (1, 'Osh', 65000, '1')").run();
  }
}

module.exports = { db, initDB, onChange, notify };