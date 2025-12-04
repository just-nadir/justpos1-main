const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');
const { db } = require('../database.cjs');

// Printerga ulanish va chop etish funksiyasi (Universal)
async function printToDevice(config, contentCallback) {
  const { ip, port, type } = config;

  if (!ip) {
    console.log("⚠️ Printer IP/Nomi yo'q, chop etilmadi.");
    return;
  }

  // Driver orqali bo'lsa, 'interface' printer nomi bo'ladi
  // LAN orqali bo'lsa, 'tcp://IP:PORT'
  let printerInterface = '';
  if (type === 'driver') {
      printerInterface = `printer:${ip}`; // node-thermal-printer sintaksisi (agar driver qo'llab-quvvatlasa)
      // Eslatma: Windows/Linux da driver orqali chop etish uchun ba'zan qo'shimcha native modullar kerak bo'lishi mumkin.
      // Lekin hozircha kutubxonaning o'z imkoniyatidan foydalanamiz.
  } else {
      printerInterface = `tcp://${ip}:${port}`;
  }

  console.log(`🖨 Ulanish: ${printerInterface} (Type: ${type})`);

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: printerInterface,
    characterSet: CharacterSet.PC852_LATIN2,
    removeSpecialCharacters: false,
    options: { timeout: 3000 },
    driver: type === 'driver' ? require('path') : undefined // Ba'zan driver talab qilinishi mumkin, hozircha oddiy
  });

  try {
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.error(`❌ Printer oflayn yoki topilmadi: ${ip}`);
      return;
    }

    // Callback orqali chek tarkibini chizish
    contentCallback(printer);
    
    printer.cut();
    await printer.execute();
    console.log(`✅ Chop etildi: ${ip}`);
  } catch (error) {
    console.error("🖨 Printer xatoligi:", error);
  }
}

function getSettings() {
    const rows = db.prepare('SELECT * FROM settings').all();
    return rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
}

module.exports = {
  // Kassa cheki (Mijoz uchun)
  printOrderReceipt: async (orderData) => {
    const settings = getSettings();
    
    // Sozlamalarda printer nomi 'printerReceiptIP' da saqlangan bo'ladi (agar driver tanlansa)
    const config = {
        ip: settings.printerReceiptIP,
        port: settings.printerReceiptPort || 9100,
        type: settings.printerReceiptType || 'lan'
    };

    await printToDevice(config, (printer) => {
        // Header
        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println(orderData.restaurantName || "RESTORAN");
        printer.bold(false);
        printer.setTextSize(0, 0);
        if (orderData.address) printer.println(orderData.address);
        if (orderData.phone) printer.println(orderData.phone);
        printer.newLine();
        
        // Info
        printer.alignLeft();
        printer.println(`Sana: ${new Date().toLocaleString()}`);
        printer.println(`Stol: ${orderData.tableName}`);
        printer.drawLine();
        
        // Items
        printer.tableCustom([
          { text: "Nomi", align: "LEFT", width: 0.5 },
          { text: "Soni", align: "CENTER", width: 0.2 },
          { text: "Summa", align: "RIGHT", width: 0.3 }
        ]);
        
        orderData.items.forEach(item => {
          printer.tableCustom([
            { text: item.product_name, align: "LEFT", width: 0.5 },
            { text: item.quantity.toString(), align: "CENTER", width: 0.2 },
            { text: (item.price * item.quantity).toLocaleString(), align: "RIGHT", width: 0.3 }
          ]);
        });
        printer.drawLine();

        // Footer
        printer.alignRight();
        if (orderData.service > 0) printer.println(`Xizmat: ${orderData.service.toLocaleString()}`);
        if (orderData.discount > 0) printer.println(`Chegirma: -${orderData.discount.toLocaleString()}`);
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println(`JAMI: ${orderData.total.toLocaleString()}`);
        printer.setTextSize(0, 0);
        
        printer.newLine();
        printer.alignCenter();
        if (orderData.footer) printer.println(orderData.footer);
        printer.println("Xaridingiz uchun rahmat!");
    });
  },

  // Oshxona cheki (Povarlar uchun)
  printKitchenTicket: async (items, tableName) => {
    const kitchens = db.prepare('SELECT * FROM kitchens').all();
    
    // Mahsulotlarni oshxona bo'yicha guruhlaymiz
    const groupedItems = {}; 

    items.forEach(item => {
        const dest = item.destination || 'default';
        if (!groupedItems[dest]) groupedItems[dest] = [];
        groupedItems[dest].push(item);
    });

    for (const [kitchenId, kitchenItems] of Object.entries(groupedItems)) {
        const kitchen = kitchens.find(k => String(k.id) === kitchenId);
        
        if (kitchen && kitchen.printer_ip) {
            const config = {
                ip: kitchen.printer_ip, // Bu yerda nom ham bo'lishi mumkin
                port: kitchen.printer_port || 9100,
                type: kitchen.printer_type || 'lan'
            };

            console.log(`👨‍🍳 Oshxonaga yuborilmoqda: ${kitchen.name}`);
            
            await printToDevice(config, (printer) => {
                printer.alignCenter();
                printer.bold(true);
                printer.setTextSize(1, 1);
                printer.println(kitchen.name.toUpperCase()); 
                printer.setTextSize(0, 0);
                printer.bold(false);
                printer.newLine();
                
                printer.alignLeft();
                printer.println(`Stol: ${tableName}`);
                printer.println(`Vaqt: ${new Date().toLocaleTimeString()}`);
                printer.drawLine();
                
                printer.bold(true);
                printer.setTextSize(1, 1);
                kitchenItems.forEach(item => {
                    printer.println(`${item.qty || item.quantity} x ${item.name || item.product_name}`);
                });
                printer.setTextSize(0, 0);
                printer.bold(false);
                printer.newLine();
                printer.println("--------------------------------");
            });
        } else {
            console.log(`⚠️ Oshxona topilmadi yoki Printer sozlanmagan. ID: ${kitchenId}`);
        }
    }
  }
};