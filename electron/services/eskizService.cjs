const axios = require('axios');
const FormData = require('form-data');
const log = require('electron-log');

// DOIMIY SOZLAMALAR
const ESKIZ_EMAIL = 'abdullayevamalika880@gmail.com';
const ESKIZ_PASSWORD = 'KHgkYNJx3wOZaTx6OOJjBlUf9QwrZjWkUAZn7BPQ';

let token = null;

const login = async () => {
    try {
        const formData = new FormData();
        formData.append('email', ESKIZ_EMAIL);
        formData.append('password', ESKIZ_PASSWORD);

        const response = await axios.post('https://notify.eskiz.uz/api/auth/login', formData, {
            headers: formData.getHeaders()
        });

        if (response.data && response.data.data && response.data.data.token) {
            token = response.data.data.token;
            log.info("Eskiz: Token muvaffaqiyatli yangilandi.");
            return token;
        } else {
            throw new Error("Token olinmadi");
        }
    } catch (error) {
        log.error("Eskiz Login Xatosi:", error.message);
        return null;
    }
};

const sendSMS = async (phone, message) => {
    if (!token) await login();
    if (!token) return { success: false, error: "Avtorizatsiya xatosi" };

    // Telefon raqamni tozalash (faqat raqamlar)
    let cleanPhone = phone.replace(/\D/g, ''); 
    // 998 bilan boshlanmasa va 9 xonali bo'lsa
    if (!cleanPhone.startsWith('998') && cleanPhone.length === 9) {
        cleanPhone = '998' + cleanPhone;
    }

    try {
        const formData = new FormData();
        formData.append('mobile_phone', cleanPhone);
        formData.append('message', message);
        formData.append('from', '4546'); // Agar shaxsiy ID bo'lmasa, 4546 qoladi

        const response = await axios.post('https://notify.eskiz.uz/api/message/sms/send', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        log.info(`SMS Yuborildi: ${cleanPhone}`);
        return { success: true, data: response.data };

    } catch (error) {
        // Agar token eskirgan bo'lsa (401), qayta login qilib ko'ramiz
        if (error.response && error.response.status === 401) {
            log.warn("Eskiz: Token eskirgan, yangilanmoqda...");
            await login();
            return sendSMSRetry(cleanPhone, message);
        }
        
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        log.error("SMS Yuborish Xatosi:", errorMsg);
        return { success: false, error: errorMsg };
    }
};

// Qayta urinish funksiyasi
const sendSMSRetry = async (phone, message) => {
    if (!token) return { success: false, error: "Token yo'q" };
    try {
        const formData = new FormData();
        formData.append('mobile_phone', phone);
        formData.append('message', message);
        formData.append('from', '4546');

        const response = await axios.post('https://notify.eskiz.uz/api/message/sms/send', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        return { success: true, data: response.data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = { sendSMS };