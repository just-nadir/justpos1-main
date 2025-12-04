const { db, notify } = require('../database.cjs');
const axios = require('axios');
const FormData = require('form-data');
const log = require('electron-log');

// Tokenni xotirada ushlab turamiz
let ESKIZ_TOKEN = null;

// Sozlamalarni olish (Database yordamchi)
const getSetting = (key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
};

// 1. Eskiz.uz Login
const loginEskiz = async () => {
    const email = getSetting('eskiz_email');
    const password = getSetting('eskiz_password');

    if (!email || !password) {
        log.warn("SMS: Eskiz login/parol sozlanmagan.");
        return null;
    }

    try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);

        const res = await axios.post('https://notify.eskiz.uz/api/auth/login', formData, {
            headers: formData.getHeaders()
        });

        if (res.data && res.data.data && res.data.data.token) {
            ESKIZ_TOKEN = res.data.data.token;
            log.info("SMS: Token yangilandi.");
            return ESKIZ_TOKEN;
        }
    } catch (err) {
        log.error("SMS Login Error:", err.message);
        return null;
    }
};

// 2. Yagona SMS yuborish
const sendOneSMS = async (phone, message, type = 'manual') => {
    const cleanPhone = phone.replace(/\D/g, ''); 
    if (cleanPhone.length < 9) return { success: false, error: "Raqam noto'g'ri" };

    if (!ESKIZ_TOKEN) await loginEskiz();
    if (!ESKIZ_TOKEN) return { success: false, error: "Avtorizatsiya xatosi" };

    try {
        const formData = new FormData();
        formData.append('mobile_phone', cleanPhone);
        formData.append('message', message);
        formData.append('from', '4546'); // Eskiz default ID

        const res = await axios.post('https://notify.eskiz.uz/api/message/sms/send', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${ESKIZ_TOKEN}`
            }
        });

        const status = 'sent';
        db.prepare('INSERT INTO sms_history (phone, message, status, date, type) VALUES (?, ?, ?, ?, ?)').run(cleanPhone, message, status, new Date().toISOString(), type);
        
        return { success: true, data: res.data };

    } catch (err) {
        if (err.response && err.response.status === 401) {
            log.info("SMS: Token eskirgan, yangilanmoqda...");
            ESKIZ_TOKEN = null;
            return sendOneSMS(phone, message, type);
        }

        const status = 'failed';
        db.prepare('INSERT INTO sms_history (phone, message, status, date, type) VALUES (?, ?, ?, ?, ?)').run(cleanPhone, message, status, new Date().toISOString(), type);
        log.error("SMS Send Error:", err.message);
        return { success: false, error: err.message };
    }
};

module.exports = {
    // Sozlamalarni saqlash
    saveSettings: (data) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        const update = db.transaction((settings) => {
            for (const [key, value] of Object.entries(settings)) stmt.run(key, String(value));
        });
        update(data);
        ESKIZ_TOKEN = null; 
        return { success: true };
    },

    // YANGI: Sozlamalarni o'qish (Faqat emailni qaytaramiz, parolni yashiramiz)
    getSettings: () => {
        const email = getSetting('eskiz_email');
        return { email: email || '' };
    },

    // Shablonlarni olish
    getTemplates: () => db.prepare('SELECT * FROM sms_templates').all(),
    
    // Shablonni yangilash
    updateTemplate: (type, text) => {
        db.prepare('UPDATE sms_templates SET template = ? WHERE type = ?').run(text, type);
        return { success: true };
    },

    // YANGI: Tarixni olish
    getHistory: () => {
        return db.prepare('SELECT * FROM sms_history ORDER BY id DESC LIMIT 100').all();
    },

    // Ommaviy yuborish (Barcha mijozlarga)
    sendBroadcast: async (message) => {
        const customers = db.prepare('SELECT phone FROM customers').all();
        let sentCount = 0;
        
        for (const c of customers) {
            if (c.phone) {
                // Sekinlatish (Rate limitga tushmaslik uchun 500ms kutamiz)
                await new Promise(r => setTimeout(r, 500)); 
                const res = await sendOneSMS(c.phone, message, 'news');
                if (res.success) sentCount++;
            }
        }
        return { success: true, count: sentCount };
    },

    sendSMS: sendOneSMS
};