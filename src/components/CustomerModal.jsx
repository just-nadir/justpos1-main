import React, { useState, useEffect } from 'react';
import { X, Search, Wallet, Percent } from 'lucide-react';

const CustomerModal = ({ isOpen, onClose, onSelectCustomer }) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]); // Bazadan keladigan mijozlar
  
  // Bazadan mijozlarni yuklash
  useEffect(() => {
    const loadCustomers = async () => {
      if (!window.electron) return;
      try {
        const { ipcRenderer } = window.electron;
        const data = await ipcRenderer.invoke('get-customers');
        setCustomers(data);
      } catch (error) {
        console.error("Mijozlarni yuklashda xatolik:", error);
      }
    };

    loadCustomers();
  }, [isOpen]); // Modal ochilganda yuklaydi

  // Qidiruv (Frontendda filter qilamiz hozircha)
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white w-[500px] h-[550px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Mijozni tanlash</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Ism yoki telefon orqali qidirish..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredCustomers.map((customer) => (
            <div 
              key={customer.id}
              onClick={() => {
                onSelectCustomer(customer);
                onClose();
              }}
              className="flex items-center justify-between p-4 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors group mb-1"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                  ${customer.type === 'discount' ? 'bg-purple-500' : 'bg-green-500'}`}>
                  {customer.type === 'discount' ? <Percent size={18} /> : <Wallet size={18} />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{customer.name}</h3>
                  <p className="text-sm text-gray-500">+998 {customer.phone}</p>
                </div>
              </div>
              
              <div className="text-right">
                {customer.type === 'discount' ? (
                  <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-bold block mb-1">
                    {customer.value}% Chegirma
                  </span>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold block mb-1">
                      Bonus
                    </span>
                    <span className="text-xs font-bold text-gray-600">
                      {customer.balance ? customer.balance.toLocaleString() : 0} so'm
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredCustomers.length === 0 && (
             <div className="text-center py-10 text-gray-400">
                Mijoz topilmadi
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;