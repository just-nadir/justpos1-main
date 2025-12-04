const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const log = require('electron-log');
const crypto = require('crypto');

// --- MUHIM O'ZGARISH: Baza manzilini to'g'ri aniqlash ---
// Agar dastur paketlanmagan bo'lsa (Dev mode), loyiha papkasida yaratamiz.
const isDev = !app.isPackaged;
const dbPath = isDev
    ? path.join(__dirname, '../pos.db') 
    : path.join(app.getPath('userData'), 'pos.db');

console.log("📂 BAZA MANZILI:", dbPath); // Terminalda ko'rinadi

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
    // 1. Zallar va Stollar
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

    // 2. Kategoriyalar va Mahsulotlar
    db.prepare(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        printer TEXT DEFAULT 'kitchen',
        status TEXT DEFAULT 'active',
        FOREIGN KEY(category_id) REFERENCES categories(id)
      )
    `).run();

    // 3. Buyurtmalar
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

    // 4. Savdolar
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
        items_json TEXT
      )
    `).run();

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

    // 5. Mijozlar va Qarzlar
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

    // 6. Xodimlar
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pin TEXT UNIQUE,
        role TEXT DEFAULT 'waiter',
        salt TEXT
      )
    `).run();

    // 7. Sozlamalar
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();

    // 8. Oshxona
    db.prepare(`CREATE TABLE IF NOT EXISTS kitchens (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, printer_ip TEXT, printer_port INTEGER DEFAULT 9100, printer_type TEXT DEFAULT 'driver')`).run();

    // 9. SMS
    db.prepare(`CREATE TABLE IF NOT EXISTS sms_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT UNIQUE, template TEXT, is_active INTEGER DEFAULT 1)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS sms_history (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, message TEXT, status TEXT, date TEXT, type TEXT)`).run();
    
    // --- INDEKSLAR ---
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tables_hall ON tables(hall_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_order_items_table ON order_items(table_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_debt_history_customer ON debt_history(customer_id)`).run();

    // --- MIGRATSIYALAR (Agar eski ustunlar yo'q bo'lsa qo'shish) ---
    const userCols = db.prepare(`PRAGMA table_info(users)`).all();
    if (!userCols.some(c => c.name === 'salt')) db.prepare(`ALTER TABLE users ADD COLUMN salt TEXT`).run();

    // --- SEEDING: Default Admin yaratish ---
    const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
    if (userCount === 0) {
        const { salt, hash } = hashPIN('1111');
        db.prepare("INSERT INTO users (name, pin, role, salt) VALUES ('Admin', ?, 'admin', ?)").run(hash, salt);
        console.log("✅ Default Admin yaratildi (PIN: 1111)");
    }

    // Default SMS
    const templateCount = db.prepare('SELECT count(*) as count FROM sms_templates').get().count;
    if (templateCount === 0) {
        const insert = db.prepare('INSERT INTO sms_templates (type, template) VALUES (?, ?)');
        insert.run('debt', 'Hurmatli {name}, sizning {amount} so\'m qarzingiz mavjud. Iltimos to\'lov qiling.');
        insert.run('news', 'Aksiya! Bizda yangi taomlar.');
        insert.run('birthday', 'Tug\'ilgan kuningiz bilan!');
    }

    log.info("Bazalar tekshirildi va yuklandi.");

  } catch (err) {
    log.error("Baza yaratishda xatolik:", err);
    console.error("Baza xatosi:", err);
  }
}

module.exports = { db, initDB, onChange, notify };