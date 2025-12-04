const cron = require('node-cron');
const { db } = require('../database.cjs');
const smsController = require('../controllers/smsController.cjs');
const log = require('electron-log');

// Shablon matnini to'ldirish (Formatlash)
const formatMessage = (template, data) => {
    let msg = template;
    for (const [key, value] of Object.entries(data)) {
        msg = msg.replace(`{${key}}`, value);
    }
    return msg;
};

// Sana farqini kunlarda hisoblash
const getDaysDifference = (date1, date2) => {
    const oneDay = 24 * 60 * 60 * 1000; // bir kundagi millisekundlar
    // Vaqtlarni (soat, daqiqa) olib tashlab, faqat sanani solishtiramiz
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.round(Math.abs((d1 - d2) / oneDay));
};

const initScheduler = () => {
    log.info("🕒 Scheduler (Avtomatlashtirish) ishga tushdi...");

    // 1. TUG'ILGAN KUN TABRIGI (Har kuni soat 09:00 da)
    cron.schedule('0 9 * * *', async () => {
        try {
            log.info("📅 Tug'ilgan kunlarni tekshirish boshlandi...");
            
            const customers = db.prepare(`
                SELECT * FROM customers 
                WHERE strftime('%m-%d', birthday) = strftime('%m-%d', 'now')
            `).all();

            if (customers.length === 0) return;

            const tmplObj = db.prepare("SELECT template FROM sms_templates WHERE type = 'birthday' AND is_active = 1").get();
            if (!tmplObj) return;

            for (const c of customers) {
                if (c.phone) {
                    // Bugun allaqachon tabriklaganmizmi?
                    const today = new Date().toISOString().split('T')[0];
                    const sentToday = db.prepare("SELECT id FROM sms_history WHERE phone = ? AND type = 'birthday' AND date LIKE ?").get(c.phone, `${today}%`);
                    
                    if (!sentToday) {
                        const msg = formatMessage(tmplObj.template, { name: c.name });
                        await smsController.sendSMS(c.phone, msg, 'birthday');
                        log.info(`🎂 SMS yuborildi: ${c.name}`);
                    }
                }
            }
        } catch (e) {
            log.error("Birthday Cron Error:", e);
        }
    });

    // 2. QARZ ESLATMASI (Har kuni soat 10:00 da tekshiradi)
    // Mantiq: 1 hafta o'tib, keyin har 2 kunda.
    cron.schedule('0 10 * * *', async () => {
        try {
            log.info("💰 Qarzdorlarni tekshirish boshlandi (Yangi Algoritm)...");

            // 1. Qarzi borlarni olamiz
            const debtors = db.prepare('SELECT * FROM customers WHERE debt > 0').all();
            
            if (debtors.length === 0) return;

            const tmplObj = db.prepare("SELECT template FROM sms_templates WHERE type = 'debt' AND is_active = 1").get();
            if (!tmplObj) return;

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            for (const d of debtors) {
                // 2. Oxirgi marta qachon qarz olgan? (debt_history dan 'debt' turini olamiz)
                const lastDebtTransaction = db.prepare(`
                    SELECT date FROM debt_history 
                    WHERE customer_id = ? AND type = 'debt' 
                    ORDER BY id DESC LIMIT 1
                `).get(d.id);

                // Agar tarixi bo'lmasa (eski mijozlar), o'tkazib yuboramiz yoki bugungi kun deb hisoblaymiz (ixtiyoriy)
                if (!lastDebtTransaction) continue;

                const lastDebtDate = new Date(lastDebtTransaction.date);
                const daysPassed = getDaysDifference(today, lastDebtDate);

                // 3. Shartlarni tekshiramiz
                // Shart A: Qarz olganiga roppa-rosa 7 kun bo'ldi
                // Shart B: 7 kundan oshgan va har 2-kunda ((kun - 7) juft son bo'lsa)
                
                let shouldSend = false;

                if (daysPassed === 7) {
                    shouldSend = true;
                } else if (daysPassed > 7 && (daysPassed - 7) % 2 === 0) {
                    shouldSend = true;
                }

                // 4. Bugun allaqachon yuborilganmi? (Spamni oldini olish)
                if (shouldSend) {
                    const sentToday = db.prepare(`
                        SELECT id FROM sms_history 
                        WHERE phone = ? AND type = 'debt' AND date LIKE ?
                    `).get(d.phone, `${todayStr}%`);

                    if (sentToday) shouldSend = false;
                }

                if (shouldSend && d.phone) {
                    const msg = formatMessage(tmplObj.template, { 
                        name: d.name, 
                        amount: d.debt.toLocaleString() 
                    });
                    
                    // SMS yuborish
                    await smsController.sendSMS(d.phone, msg, 'debt');
                    log.info(`💸 Qarz eslatmasi yuborildi (${daysPassed} kun): ${d.name}`);
                }
            }
        } catch (e) {
            log.error("Debt Cron Error:", e);
        }
    });
};

module.exports = initScheduler;