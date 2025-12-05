const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const log = require('electron-log');
const crypto = require('crypto');

// --- Baza manzilini aniqlash ---
const isDev = !app.isPackaged;
const dbPath = isDev
    ? path.join(__dirname, '../pos.db') 
    : path.join(app.getPath('userData'), 'pos.db');

console.log("📂 BAZA MANZILI:", dbPath);

const db = new Database(dbPath, { verbose: null });
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

let changeListeners = [];

function onChange(callback) {
  changeListeners.push(callback);
}

function notify(type, id = null) {
  changeListeners.forEach(cb => cb(type, id));
}

// Hashlash funksiyasi
function hashPIN(pin, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function initDB() {
  try {
    // 1. Kategoriyalar va Mahsulotlar (Eng asosiylari)
    db.prepare(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS halls (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`).run();
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hall_id INTEGER,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'free',
        start_time TEXT,
        total_amount REAL DEFAULT 0,
        current_check_number INTEGER DEFAULT 0,
        waiter_id INTEGER DEFAULT 0,
        waiter_name TEXT,
        guests INTEGER DEFAULT 0,
        FOREIGN KEY(hall_id) REFERENCES halls(id) ON DELETE CASCADE
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        printer TEXT DEFAULT 'kitchen',
        status TEXT DEFAULT 'active',
        destination TEXT, 
        is_active INTEGER DEFAULT 1,
        image TEXT,
        FOREIGN KEY(category_id) REFERENCES categories(id)
      )
    `).run();

    // 2. Buyurtmalar
    db.prepare(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id INTEGER,
        product_name TEXT,
        price REAL,
        quantity INTEGER,
        destination TEXT DEFAULT 'kitchen',
        FOREIGN KEY(table_id) REFERENCES tables(id) ON DELETE CASCADE
      )
    `).run();

    // 3. Savdolar (Sales)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_number INTEGER,
        date TEXT,
        total_amount REAL,
        subtotal REAL,
        discount REAL,
        payment_method TEXT,
        customer_id INTEGER,
        waiter_name TEXT,
        guest_count INTEGER,
        items_json TEXT,
        debt_due_date TEXT,
        last_sms_date TEXT
      )
    `).run();

    // --- SALES JADVALI MIGRATSIYASI (Yangi ustunlar qo'shish) ---
    try {
      const salesColumns = db.prepare("PRAGMA table_info(sales)").all();
      const hasDueDate = salesColumns.some(col => col.name === 'debt_due_date');
      const hasLastSms = salesColumns.some(col => col.name === 'last_sms_date');

      if (!hasDueDate) {
        db.prepare("ALTER TABLE sales ADD COLUMN debt_due_date TEXT").run();
        console.log("MIGRATION: 'debt_due_date' ustuni sales jadvaliga qo'shildi.");
      }
      if (!hasLastSms) {
        db.prepare("ALTER TABLE sales ADD COLUMN last_sms_date TEXT").run();
        console.log("MIGRATION: 'last_sms_date' ustuni sales jadvaliga qo'shildi.");
      }
    } catch (migErr) {
      console.error("Sales migratsiyasida xatolik:", migErr);
    }

    db.prepare(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        product_name TEXT,
        category_name TEXT,
        price REAL,
        quantity REAL,
        total_price REAL,
        date TEXT,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
      )
    `).run();

    // 4. Mijozlar va Qarzlar
    db.prepare(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        debt REAL DEFAULT 0,
        notes TEXT,
        type TEXT DEFAULT 'standard', 
        value INTEGER DEFAULT 0, 
        balance REAL DEFAULT 0, 
        birthday TEXT
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS debt_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        amount REAL,
        type TEXT,
        date TEXT,
        comment TEXT,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `).run();

    // 5. Xodimlar
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pin TEXT UNIQUE,
        role TEXT DEFAULT 'waiter',
        salt TEXT
      )
    `).run();

    // 6. Sozlamalar va Oshxona
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS kitchens (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, printer_ip TEXT, printer_port INTEGER DEFAULT 9100, printer_type TEXT DEFAULT 'driver')`).run();

    // 7. SMS (TUZATILDI)
    // Agar sms_templates jadvali eski bo'lsa, uni tekshiramiz va kerak bo'lsa yangilaymiz.
    // Eng oddiy yo'l: title ustuni yo'q bo'lsa, jadvalni o'chirib yangidan yaratamiz (chunki bu shablonlar).
    try {
      // Jadval borligini tekshirish
      const checkTbl = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sms_templates'").get();
      
      if (checkTbl) {
        const smsCols = db.prepare("PRAGMA table_info(sms_templates)").all();
        const hasTitle = smsCols.some(col => col.name === 'title');
        
        // Agar title ustuni bo'lmasa, jadvalni yangilash kerak
        if (!hasTitle) {
           console.log("MIGRATION: Eski sms_templates jadvali o'chirilib, yangisi yaratilmoqda...");
           db.prepare("DROP TABLE sms_templates").run();
        }
      }

      // Yangi jadvalni yaratish
      db.prepare(`
        CREATE TABLE IF NOT EXISTS sms_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT UNIQUE NOT NULL, 
          title TEXT NOT NULL,
          template TEXT NOT NULL,
          is_active INTEGER DEFAULT 1
        )
      `).run();

      db.prepare(`CREATE TABLE IF NOT EXISTS sms_history (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, message TEXT, status TEXT, date TEXT, type TEXT)`).run();

    } catch (smsErr) {
      console.error("SMS jadvallarini yaratishda xato:", smsErr);
    }

    // --- INDEKSLAR ---
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tables_hall ON tables(hall_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_order_items_table ON order_items(table_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_debt_history_customer ON debt_history(customer_id)`).run();

    // --- MIGRATSIYALAR (Users) ---
    const userCols = db.prepare(`PRAGMA table_info(users)`).all();
    if (!userCols.some(c => c.name === 'salt')) db.prepare(`ALTER TABLE users ADD COLUMN salt TEXT`).run();

    // --- SEEDING: Default Admin ---
    const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
    if (userCount === 0) {
        const { salt, hash } = hashPIN('1111');
        db.prepare("INSERT INTO users (name, pin, role, salt) VALUES ('Admin', ?, 'admin', ?)").run(hash, salt);
        console.log("✅ Default Admin yaratildi (PIN: 1111)");
    }

    // --- SEEDING: SMS Shablonlari ---
    try {
        const templateCount = db.prepare('SELECT count(*) as count FROM sms_templates').get().count;
        if (templateCount === 0) {
            const insertTpl = db.prepare('INSERT INTO sms_templates (type, title, template, is_active) VALUES (?, ?, ?, ?)');
            
            insertTpl.run('debt', 'Qarz Eslatmasi', 'Hurmatli {name}, sizning {amount} so\'m qarzingiz to\'lov muddati keldi. Iltimos, to\'lovni amalga oshiring. {restaurant}', 1);
            insertTpl.run('birthday', 'Tug\'ilgan Kun', 'Hurmatli {name}, tug\'ilgan kuningiz bilan! Sizni {restaurant} da kutib qolamiz. Maxsus chegirma sizni kutmoqda!', 1);
            insertTpl.run('new_dish', 'Yangi Taom', 'Yangi taom: {dish_name}! {restaurant} ga kelib ta\'tib ko\'ring.', 1);
            
            console.log("✅ Default SMS shablonlar yaratildi");
        }
    } catch (err) {
        console.error("SMS shablonlarini seed qilishda xato:", err);
    }

    // --- SEEDING: Default Oshxona/Zal ---
    const stmtHalls = db.prepare('SELECT count(*) as count FROM halls');
    if (stmtHalls.get().count === 0) {
        const hall1 = db.prepare("INSERT INTO halls (name) VALUES ('Asosiy Zal')").run().lastInsertRowid;
        db.prepare("INSERT INTO tables (hall_id, name) VALUES (?, 'Stol 1')").run(hall1);
        db.prepare("INSERT INTO categories (name) VALUES ('Taomlar')").run();
        db.prepare("INSERT INTO products (category_id, name, price, destination) VALUES (1, 'Osh', 65000, '1')").run();
    }

    log.info("Bazalar tekshirildi va yuklandi.");

  } catch (err) {
    log.error("Baza yaratishda xatolik:", err);
    console.error("Baza xatosi:", err);
  }
}

module.exports = { db, initDB, onChange, notify };