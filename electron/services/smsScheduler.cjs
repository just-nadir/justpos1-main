const { db } = require('../database.cjs');
const eskizService = require('./eskizService.cjs');
const log = require('electron-log');

// Yordamchi: Shablonni to'ldirish
const formatMessage = (template, data) => {
    if (!template) return "";
    return template.replace(/{(\w+)}/g, (_, key) => data[key] || '');
};

const getTemplate = (type) => {
    try {
        const row = db.prepare('SELECT template FROM sms_templates WHERE type = ? AND is_active = 1').get(type);
        return row ? row.template : null;
    } catch (e) {
        return null;
    }
};

// 1. QARZLARNI TEKSHIRISH
const checkDebts = async () => {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // To'lanmagan (qarz) savdolar, lekin muddati belgilanganlari
        const debts = db.prepare(`
            SELECT s.id, s.total_amount, s.debt_due_date, s.last_sms_date, c.name, c.phone 
            FROM sales s 
            JOIN customers c ON s.customer_id = c.id 
            WHERE s.payment_method = 'debt' 
            AND s.debt_due_date IS NOT NULL 
            AND s.debt_due_date != ''
        `).all();

        const template = getTemplate('debt');
        if (!template) return;

        // Restoran nomini olish
        let restaurantName = "Bizning Restoran";
        try {
            const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'restaurantName'").get();
            if (settingRow) restaurantName = settingRow.value;
        } catch (e) {}

        for (const debt of debts) {
            const dueDate = new Date(debt.debt_due_date);
            const timeDiff = today.getTime() - dueDate.getTime();
            const daysOverdue = Math.floor(timeDiff / (1000 * 3600 * 24));

            let shouldSend = false;

            // 1. Bugun to'lov kuni bo'lsa
            if (todayStr === debt.debt_due_date) {
                shouldSend = true;
            } 
            // 2. Muddati o'tgan bo'lsa va har 3 kunda (3, 6, 9...)
            else if (daysOverdue > 0 && daysOverdue % 3 === 0) {
                shouldSend = true;
            }

            // Agar bugun allaqachon sms yuborilgan bo'lsa, qayta yubormaymiz
            if (debt.last_sms_date === todayStr) {
                shouldSend = false;
            }

            if (shouldSend) {
                const message = formatMessage(template, {
                    name: debt.name,
                    amount: debt.total_amount.toLocaleString(),
                    restaurant: restaurantName
                });

                log.info(`SCHEDULER: Qarz SMS rejalashtirildi -> ${debt.name}`);
                
                const res = await eskizService.sendSMS(debt.phone, message);
                
                if (res.success) {
                    db.prepare('UPDATE sales SET last_sms_date = ? WHERE id = ?').run(todayStr, debt.id);
                    db.prepare('INSERT INTO sms_history (phone, message, status, date, type) VALUES (?, ?, ?, ?, ?)')
                      .run(debt.phone, message, 'sent', new Date().toISOString(), 'debt');
                }
            }
        }
    } catch (err) {
        log.error("Debt Scheduler Xatosi:", err);
    }
};

// 2. TUG'ILGAN KUNLARNI TEKSHIRISH
const checkBirthdays = async () => {
    try {
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const currentMonthDay = todayStr.slice(5); // MM-DD

        // Tug'ilgan kuni bugun bo'lgan mijozlar
        const customers = db.prepare(`
            SELECT * FROM customers 
            WHERE strftime('%m-%d', birthday) = ?
        `).all(currentMonthDay);

        const template = getTemplate('birthday');
        if (!template || customers.length === 0) return;

        let restaurantName = "Bizning Restoran";
        try {
            const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'restaurantName'").get();
            if (settingRow) restaurantName = settingRow.value;
        } catch (e) {}

        for (const customer of customers) {
            // Bugun bu mijozga tabrik yuborilganmi?
            const alreadySent = db.prepare(`
                SELECT id FROM sms_history 
                WHERE phone = ? AND type = 'birthday' AND date LIKE ?
            `).get(customer.phone, `${todayStr}%`);

            if (!alreadySent) {
                const message = formatMessage(template, {
                    name: customer.name,
                    restaurant: restaurantName
                });

                log.info(`SCHEDULER: Tug'ilgan kun SMS -> ${customer.name}`);
                
                const res = await eskizService.sendSMS(customer.phone, message);
                
                if (res.success) {
                    db.prepare('INSERT INTO sms_history (phone, message, status, date, type) VALUES (?, ?, ?, ?, ?)')
                      .run(customer.phone, message, 'sent', new Date().toISOString(), 'birthday');
                }
            }
        }

    } catch (err) {
        log.error("Birthday Scheduler Xatosi:", err);
    }
};

// Asosiy ishga tushirish funksiyasi
const startScheduler = () => {
    log.info("🕒 SMS Scheduler ishga tushdi...");
    
    // Dastur yonishi bilan bir marta tekshiramiz
    checkDebts();
    checkBirthdays();

    // Har 1 soatda tekshirib turamiz
    setInterval(() => {
        checkDebts();
        checkBirthdays();
    }, 3600000); 
};

module.exports = { startScheduler };