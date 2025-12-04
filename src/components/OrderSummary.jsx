import React, { useState, useEffect } from 'react';
import { CreditCard, Users, User, Wallet, X, Printer, Hash } from 'lucide-react';
import PaymentModal from './PaymentModal';
import CustomerModal from './CustomerModal';

const OrderSummary = ({ table, onDeselect }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [bonusToUse, setBonusToUse] = useState(0);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const loadSettings = async () => {
      if (!window.electron) return;
      try {
        const { ipcRenderer } = window.electron;
        const data = await ipcRenderer.invoke('get-settings');
        setSettings(data);
      } catch (err) { console.error(err); }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    setSelectedCustomer(null);
    setBonusToUse(0);
    setOrderItems([]);
    if (table) {
      loadOrderItems(table.id);
    }
  }, [table]);

  const loadOrderItems = async (tableId) => {
    if (!window.electron) return;
    setLoading(true);
    try {
      const { ipcRenderer } = window.electron;
      const items = await ipcRenderer.invoke('get-table-items', tableId);
      setOrderItems(items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCheck = async () => {
    if (!table || !window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      // Chek chiqarish uchun hozirgi holatdagi checkout funksiyasiga o'xshash alohida 'print-check' handler ham qo'shish mumkin
      // Lekin hozircha statusni o'zgartirish bilan cheklanamiz
      await ipcRenderer.invoke('update-table-status', { id: table.id, status: 'payment' });
    } catch (error) { console.error(error); }
  };

  const subtotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const guestsCount = table?.guests || 0;

  let service = 0;
  const svcValue = Number(settings.serviceChargeValue) || 0;
  
  if (settings.serviceChargeType === 'percent') {
      service = (subtotal * svcValue) / 100;
  } else {
      service = guestsCount * svcValue;
  }

  const preTotal = subtotal + service;

  let discountAmount = 0;
  if (selectedCustomer) {
    if (selectedCustomer.type === 'discount') {
      discountAmount = (subtotal * selectedCustomer.value) / 100;
    } else if (selectedCustomer.type === 'cashback') {
      discountAmount = bonusToUse;
    }
  }
  const finalTotal = preTotal - discountAmount;

  const handlePaymentSuccess = async (method) => {
    if (!table || !window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      
      const checkoutData = {
          tableId: table.id,
          total: finalTotal,
          subtotal: subtotal,
          discount: discountAmount,
          paymentMethod: method,
          customerId: selectedCustomer ? selectedCustomer.id : null,
          items: orderItems
      };

      await ipcRenderer.invoke('checkout', checkoutData);
      
      setIsPaymentModalOpen(false);
      if (onDeselect) onDeselect();

    } catch (error) {
      console.error(error);
    }
  };
  
  const handleBonusChange = (e) => {
    const valueStr = e.target.value;
    if (valueStr === '') {
        setBonusToUse(0);
        return;
    }
    let val = Number(valueStr);
    if (val < 0) return;
    if (val > selectedCustomer.balance) val = selectedCustomer.balance;
    if (val > preTotal) val = preTotal;
    setBonusToUse(val);
  };

  if (!table) {
     return (
      <div className="w-96 bg-white h-screen shadow-xl border-l border-gray-100 flex flex-col items-center justify-center text-gray-400 p-10 text-center">
        <div className="bg-gray-100 p-6 rounded-full mb-4"><CreditCard size={48} /></div>
        <h3 className="font-bold text-lg text-gray-600">Stol tanlanmagan</h3>
        <p>Buyurtmani ko'rish uchun chap tomondan faol stolni tanlang.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-96 bg-white h-screen shadow-xl flex flex-col border-l border-gray-100">
        {/* HEADER */}
        <div className={`p-6 border-b border-gray-100 ${table.status === 'payment' ? 'bg-yellow-50' : 'bg-gray-50'}`}>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-bold text-gray-800">{table.name}</h2>
            
            {/* --- YANGI: CHEK RAQAMI --- */}
            {table.current_check_number > 0 && (
                <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
                    <Hash size={14} className="text-gray-500" />
                    <span className="font-black text-lg text-gray-800">{table.current_check_number}</span>
                </div>
            )}
            {/* ------------------------- */}
          </div>
          
          <div className="flex justify-between items-center mt-2">
             <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Users size={14} /> <span>{guestsCount} mehmon</span>
             </div>
             <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
              ${table.status === 'occupied' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {table.status === 'occupied' ? 'Band' : 'To\'lov'}
            </span>
          </div>
        </div>

        {/* CUSTOMER */}
        {selectedCustomer && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
             <div className="flex justify-between items-start mb-2">
               <div className="flex items-center gap-2">
                  <User size={18} className="text-blue-600" />
                  <div>
                     <p className="font-bold text-blue-800">{selectedCustomer.name}</p>
                     <p className="text-xs text-blue-600">
                        {selectedCustomer.type === 'discount' 
                          ? `VIP: ${selectedCustomer.value}% Chegirma` 
                          : `Bonus: ${selectedCustomer.balance.toLocaleString()} so'm`}
                     </p>
                  </div>
               </div>
               <button onClick={() => setSelectedCustomer(null)} className="p-1 hover:bg-blue-200 rounded text-blue-600"><X size={16} /></button>
             </div>
             {selectedCustomer.type === 'cashback' && selectedCustomer.balance > 0 && (
               <div className="bg-white p-2 rounded-lg border border-blue-200 mt-2">
                 <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Bonusdan:</span><span>Max: {selectedCustomer.balance.toLocaleString()}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-green-500" />
                    <input 
                        type="number" 
                        value={bonusToUse === 0 ? '' : bonusToUse} 
                        onChange={handleBonusChange} 
                        placeholder="Summa" 
                        className="w-full outline-none text-sm font-bold text-gray-800 bg-transparent"
                    />
                 </div>
               </div>
             )}
          </div>
        )}

        {/* ITEMS */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <div className="text-center mt-10 text-gray-400">Yuklanmoqda...</div> : 
           orderItems.length === 0 ? <div className="text-center mt-10 text-gray-400">Buyurtmalar yo'q</div> :
           orderItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-3 border-b border-dashed border-gray-200 last:border-0">
              <div>
                <p className="font-medium text-gray-800">{item.product_name}</p>
                <p className="text-xs text-gray-400">{item.price.toLocaleString()} x {item.quantity}</p>
              </div>
              <p className="font-bold text-gray-700">{(item.price * item.quantity).toLocaleString()}</p>
            </div>
          ))}
        </div>
        
        {/* TOTALS */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-gray-600"><span>Stol hisobi:</span><span>{subtotal.toLocaleString()}</span></div>
          
          <div className="flex justify-between text-gray-600">
             <span>Xizmat ({settings.serviceChargeType === 'percent' ? `${settings.serviceChargeValue}%` : 'Fixed'}):</span>
             <span>{service.toLocaleString()}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-orange-600 font-medium"><span>Chegirma:</span><span>- {discountAmount.toLocaleString()}</span></div>
          )}
          <div className="flex justify-between text-2xl font-bold text-blue-600 mt-2 border-t border-gray-200 pt-2"><span>Jami:</span><span>{finalTotal.toLocaleString()}</span></div>
        </div>

        {/* BUTTONS */}
        <div className="p-4 border-t border-gray-100 space-y-3 bg-white">
          <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setIsCustomerModalOpen(true)} className={`flex items-center justify-center gap-2 py-3 border-2 rounded-xl font-bold transition-colors ${selectedCustomer ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'}`}>
                  <User size={20} /> {selectedCustomer ? 'Almashtirish' : 'Mijoz'}
              </button>
              <button onClick={handlePrintCheck} className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-gray-100 text-gray-700 rounded-xl font-bold hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200 transition-colors">
                  <Printer size={20} /> Chek
              </button>
          </div>
          <button onClick={() => setIsPaymentModalOpen(true)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            <CreditCard size={20} /> To'lovni Yopish
          </button>
        </div>
      </div>

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        totalAmount={finalTotal}
        onPay={handlePaymentSuccess}
        selectedCustomer={selectedCustomer}
      />
      <CustomerModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSelectCustomer={setSelectedCustomer} />
    </>
  );
};

export default OrderSummary;