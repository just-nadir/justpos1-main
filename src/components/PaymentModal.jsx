import React, { useState } from 'react';
import { X, Banknote, CreditCard, Smartphone, Check, FileText, AlertCircle } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, totalAmount, onPay, selectedCustomer }) => {
  if (!isOpen) return null;

  const [activeMethod, setActiveMethod] = useState('cash');
  const [error, setError] = useState('');

  // To'lov turlari
  const paymentMethods = [
    { id: 'cash', label: 'Naqd', icon: <Banknote size={24} /> },
    { id: 'card', label: 'Karta', icon: <CreditCard size={24} /> },
    { id: 'click', label: 'Click / Payme', icon: <Smartphone size={24} /> },
    // YANGI: Nasiya
    { id: 'debt', label: 'Nasiya (Qarz)', icon: <FileText size={24} /> },
  ];

  const handlePayment = () => {
    // Agar Nasiya tanlangan bo'lsa va mijoz tanlanmagan bo'lsa -> Xatolik
    if (activeMethod === 'debt' && !selectedCustomer) {
      setError("Nasiya yozish uchun avval mijozni tanlashingiz shart!");
      return;
    }

    if (onPay) {
        onPay(activeMethod);
    } else {
        onClose();
    }
  };

  const selectMethod = (id) => {
      setActiveMethod(id);
      setError(''); // Metod o'zgarganda xatoni tozalash
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-white w-[500px] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">To'lov qilish</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-6">
          <div className="text-center mb-8">
            <p className="text-gray-500 mb-1">Jami to'lov summasi</p>
            <h1 className="text-4xl font-bold text-blue-600">{totalAmount.toLocaleString()} <span className="text-xl text-gray-400">so'm</span></h1>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {paymentMethods.map((method) => (
              <button 
                key={method.id} 
                onClick={() => selectMethod(method.id)} 
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${activeMethod === method.id 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}
                  ${method.id === 'debt' ? 'text-orange-600' : ''}
                  `}
              >
                <div className={`${method.id === 'debt' && activeMethod !== 'debt' ? 'text-orange-400' : ''}`}>{method.icon}</div>
                <span className="font-medium">{method.label}</span>
                {activeMethod === method.id && <div className="ml-auto text-blue-500"><Check size={16} /></div>}
              </button>
            ))}
          </div>

          {/* Xato xabari */}
          {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-bold animate-pulse">
                  <AlertCircle size={18} /> {error}
              </div>
          )}

          {/* Agar Nasiya tanlangan bo'lsa, ogohlantirish */}
          {activeMethod === 'debt' && !error && (
             <div className={`text-center text-sm mb-4 p-2 rounded-lg ${selectedCustomer ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600 font-bold'}`}>
               {selectedCustomer 
                 ? `Qarz "${selectedCustomer.name}" nomiga yoziladi.` 
                 : "DIQQAT: Nasiya uchun mijoz tanlanmagan!"}
             </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-4 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors">Bekor qilish</button>
            <button onClick={handlePayment} className="flex-1 py-4 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:bg-green-600 transition-transform active:scale-95">To'lash</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;