const { BrowserWindow } = require('electron');
const { db } = require('../database.cjs');

// Sozlamalarni olish
function getSettings() {
    try {
        const rows = db.prepare('SELECT * FROM settings').all();
        return rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
    } catch (e) {
        console.error("Sozlamalarni olishda xato:", e);
        return {};
    }
}

// Yordamchi: HTML shablon yaratish
function createHtmlTemplate(bodyContent) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Courier New', Courier, monospace;
                width: 270px; /* 80mm printer standarti */
                margin: 0 auto;
                padding: 0;
                font-size: 12px;
                color: #000000;
                line-height: 1.2;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            
            /* Chiziqlar */
            .line { border-bottom: 1px dashed #000000; margin: 8px 0; }
            .double-line { border-bottom: 3px double #000000; margin: 8px 0; }
            
            .flex { display: flex; justify-content: space-between; }
            .mb-1 { margin-bottom: 5px; }
            
            /* Sarlavha */
            .header-title { font-size: 18px; margin-bottom: 5px; font-weight: bold; }
            .header-info { font-size: 11px; margin-bottom: 2px; }
            
            /* Jadval */
            table { width: 100%; border-collapse: collapse; margin: 5px 0; }
            td { vertical-align: top; padding: 4px 0; }
            .col-name { text-align: left; width: 55%; }
            .col-qty { text-align: center; width: 15%; }
            .col-price { text-align: right; width: 30%; }
            
            /* Jami hisob */
            .total-row { font-size: 16px; font-weight: bold; margin-top: 5px; }
            .footer-msg { font-size: 11px; margin-top: 10px; font-style: italic; }
        </style>
    </head>
    <body>
        ${bodyContent}
        <br/>
        <div class="text-center">.</div> 
    </body>
    </html>
    `;
}

// Asosiy chop etish funksiyasi (Yashirin oyna orqali)
async function printHtml(htmlContent, printerName) {
    const workerWindow = new BrowserWindow({
        show: false,
        width: 400,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    try {
        const htmlBase64 = Buffer.from(htmlContent).toString('base64');
        await workerWindow.loadURL(`data:text/html;base64,${htmlBase64}`);
        await new Promise(resolve => setTimeout(resolve, 500));

        const options = {
            silent: true,
            printBackground: true,
            deviceName: printerName
        };

        if (!printerName) {
            console.warn("⚠️ Printer nomi ko'rsatilmagan, default printer ishlatiladi.");
            delete options.deviceName;
        } else {
            console.log(`🖨 Chop etilmoqda (HTML): ${printerName}`);
        }

        await new Promise((resolve, reject) => {
            workerWindow.webContents.print(options, (success, errorType) => {
                if (!success) {
                    reject(new Error(errorType));
                } else {
                    resolve();
                }
            });
        });
        console.log("✅ Muvaffaqiyatli chop etildi!");

    } catch (error) {
        console.error("❌ Chop etishda xatolik:", error);
        throw error;
    } finally {
        workerWindow.close();
    }
}

module.exports = {
    // 1. Kassa Cheki
    printOrderReceipt: async (orderData) => {
        const settings = getSettings();
        const printerName = settings.printerReceiptIP;

        const restaurantName = settings.restaurantName || "RESTORAN";
        const address = settings.address || "";
        const phone = settings.phone || "";
        const footerText = settings.receiptFooter || "Xaridingiz uchun rahmat!";
        const checkNum = orderData.checkNumber || 0;
        const waiterName = orderData.waiterName || "Kassir";

        const itemsHtml = orderData.items.map(item => `
            <tr>
                <td class="col-name">${item.product_name}</td>
                <td class="col-qty">${item.quantity}</td>
                <td class="col-price">${(item.price * item.quantity).toLocaleString()}</td>
            </tr>
        `).join('');

        const paymentMap = { 'cash': 'Naqd', 'card': 'Karta', 'click': 'Click/Payme', 'debt': 'Nasiya' };
        const paymentMethod = paymentMap[orderData.paymentMethod] || orderData.paymentMethod || 'Naqd';

        const content = `
            <div class="text-center">
                <div class="header-title uppercase">${restaurantName}</div>
                ${address ? `<div class="header-info">${address}</div>` : ''}
                ${phone ? `<div class="header-info">Tel: ${phone}</div>` : ''}
            </div>
            
            <div class="double-line"></div>
            
            <div class="flex">
                <span>Chek:</span>
                <span class="bold"># ${checkNum}</span>
            </div>
            <div class="flex">
                <span>Sana:</span>
                <span>${new Date().toLocaleString('uz-UZ')}</span>
            </div>
            <div class="flex">
                <span>Stol:</span>
                <span class="bold">${orderData.tableName}</span>
            </div>
            <div class="flex" style="margin-top: 2px;">
                <span>Ofitsiant:</span>
                <span class="bold uppercase" style="font-size: 14px;">${waiterName}</span>
            </div>
            <div class="flex">
                <span>To'lov:</span>
                <span class="bold">${paymentMethod}</span>
            </div>

            <div class="line"></div>

            <table>
                <tr style="border-bottom: 1px solid #000;">
                    <td class="col-name bold">Nomi</td>
                    <td class="col-qty bold">Soni</td>
                    <td class="col-price bold">Summa</td>
                </tr>
                ${itemsHtml}
            </table>

            <div class="line"></div>

            <div class="flex">
                <span>Jami:</span>
                <span>${(orderData.subtotal || 0).toLocaleString()}</span>
            </div>
            
            ${orderData.service > 0 ? `
            <div class="flex">
                <span>Xizmat:</span>
                <span>${orderData.service.toLocaleString()}</span>
            </div>` : ''}

            ${orderData.discount > 0 ? `
            <div class="flex">
                <span>Chegirma:</span>
                <span>-${orderData.discount.toLocaleString()}</span>
            </div>` : ''}

            <div class="double-line"></div>

            <div class="flex total-row">
                <span>JAMI:</span>
                <span>${orderData.total.toLocaleString()} so'm</span>
            </div>

            <div class="text-center footer-msg">
                ${footerText}
            </div>
        `;

        const fullHtml = createHtmlTemplate(content);
        await printHtml(fullHtml, printerName);
    },

    // 2. Oshxona Cheki (Runner)
    printKitchenTicket: async (items, tableName, checkNumber, waiterName) => {
        const kitchens = db.prepare('SELECT * FROM kitchens').all();
        
        const groupedItems = {};
        items.forEach(item => {
            const dest = item.destination || 'default';
            if (!groupedItems[dest]) groupedItems[dest] = [];
            groupedItems[dest].push(item);
        });

        for (const [kitchenId, kitchenItems] of Object.entries(groupedItems)) {
            const kitchen = kitchens.find(k => String(k.id) === kitchenId);
            
            if (kitchen && kitchen.printer_ip) {
                console.log(`👨‍🍳 Oshxonaga yuborilmoqda: ${kitchen.name}`);

                const itemsHtml = kitchenItems.map(item => `
                    <tr>
                        <td class="text-left bold" style="font-size: 16px; padding: 5px 0;">${item.name || item.product_name}</td>
                        <td class="text-right bold" style="font-size: 18px;">x${item.qty || item.quantity}</td>
                    </tr>
                `).join('');

                const content = `
                    <div class="text-center">
                        <div class="header-title" style="background: #000; color: #fff; padding: 5px; display: block;">${kitchen.name.toUpperCase()}</div>
                    </div>
                    
                    <div class="mb-1"></div>

                    <div class="flex bold" style="font-size: 14px;">
                        <span>Chek:</span>
                        <span style="font-size: 18px;"># ${checkNumber || '?'}</span>
                    </div>
                    <div class="flex bold" style="font-size: 14px;">
                        <span>Stol:</span>
                        <span style="font-size: 18px;">${tableName}</span>
                    </div>
                    <div class="flex" style="border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">
                        <span style="font-weight: bold;">Ofitsiant:</span>
                        <span class="uppercase bold" style="font-size: 16px;">${waiterName || "-"}</span>
                    </div>
                    <div class="flex">
                        <span>Vaqt:</span>
                        <span>${new Date().toLocaleTimeString('uz-UZ')}</span>
                    </div>

                    <div class="line"></div>

                    <table>
                        ${itemsHtml}
                    </table>

                    <div class="line"></div>
                `;

                const fullHtml = createHtmlTemplate(content);
                await printHtml(fullHtml, kitchen.printer_ip);
            } else {
                console.log(`⚠️ Oshxona topilmadi yoki Printer sozlanmagan. ID: ${kitchenId}`);
            }
        }
    }
};