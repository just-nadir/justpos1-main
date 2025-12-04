import React, { useState, useEffect } from 'react';
import { User, Calendar, FileText, ArrowDownLeft, ArrowUpRight, Wallet, Search, CheckCircle } from 'lucide-react';

const DebtorsManagement = () => {
  const [debtors, setDebtors] = useState([]);
  const [activeDebtor, setActiveDebtor] = useState(null);
  const [history, setHistory] = useState([]);
  const [payAmount, setPayAmount] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Qarzdorlarni yuklash
  const loadDebtors = async () => {
    if (!window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      const data = await ipcRenderer.invoke('get-debtors');
      setDebtors(data);
      
      if (activeDebtor) {
        const updated = data.find(d => d.id === activeDebtor.id);
        if (updated) {
            setActiveDebtor(updated);
        } else {
            setActiveDebtor(null); 
        }
      }
    } catch (err) { console.error(err); }
  };

  const loadHistory = async (id) => {
    if (!window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      const data = await ipcRenderer.invoke('get-debt-history', id);
      setHistory(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadDebtors(); }, []);

  useEffect(() => {
    if (activeDebtor) {
      loadHistory(activeDebtor.id);
    }
  }, [activeDebtor]);

  useEffect(() => {
      if(isSuccess) {
          const timer = setTimeout(() => setIsSuccess(false), 3000);
          return () => clearTimeout(timer);
      }
  }, [isSuccess]);

  // 3. Qarzni to'lash
  const handlePayDebt = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;
    
    if (!window.electron) return;

    try {
      const { ipcRenderer } = window.electron;
      await ipcRenderer.invoke('pay-debt', {
        customerId: activeDebtor.id,
        amount: Number(payAmount),
        comment: "Qarz to'lovi"
      });
      
      setPayAmount('');
      loadDebtors();
      loadHistory(activeDebtor.id);
      setIsSuccess(true); // Alert o'rniga state
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex w-full h-full bg-gray-100 relative">
      {/* Toast Notification */}
      {isSuccess && (
          <div className="absolute top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-300">
              <CheckCircle size={20} /> To'lov qabul qilindi!
          </div>
      )}

      {/* 2-QISM: RO'YXAT (Oq fon) */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Qarzdorlar</h2>
          <p className="text-sm text-gray-400">Jami: {debtors.length} kishi</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {debtors.map(debtor => (
            <button
              key={debtor.id}
              onClick={() => setActiveDebtor(debtor)}
              className={`w-full p-4 rounded-xl text-left transition-all group border-2 
                ${activeDebtor?.id === debtor.id 
                  ? 'bg-red-50 border-red-200 shadow-sm' 
                  : 'bg-white border-transparent hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`font-bold ${activeDebtor?.id === debtor.id ? 'text-red-700' : 'text-gray-700'}`}>
                  {debtor.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{debtor.phone}</span>
                <span className="text-sm font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">
                  {debtor.debt.toLocaleString()}
                </span>
              </div>
            </button>
          ))}
          
          {debtors.length === 0 && (
            <div className="text-center py-10 text-gray-400 flex flex-col items-center">
               <Wallet size={40} className="mb-2 opacity-20" />
               Qarzdorlar yo'q
            </div>
          )}
        </div>
      </div>

      {/* 3-QISM: TAFSILOTLAR (Kulrang fon) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeDebtor ? (
          <>
            {/* Header Info */}
            <div className="bg-white px-8 py-6 border-b border-gray-200 shadow-sm flex justify-between items-center z-10">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-1">{activeDebtor.name}</h1>
                <div className="flex items-center gap-4 text-gray-500 text-sm">
                  <span className="flex items-center gap-1"><User size={14} /> {activeDebtor.phone}</span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Joriy Qarz</p>
                <p className="text-4xl font-bold text-red-600">{activeDebtor.debt.toLocaleString()} <span className="text-lg text-gray-400 font-normal">so'm</span></p>
              </div>
            </div>

            {/* Action Area (Payment) */}
            <div className="px-8 py-6 bg-white border-b border-gray-200">
                <form onSubmit={handlePayDebt} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Qarzni so'ndirish</label>
                    <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="number" 
                            placeholder="Summa kiriting..." 
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all text-lg font-bold text-gray-700"
                        />
                    </div>
                  </div>
                  <button type="submit" className="bg-green-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-green-600 shadow-md active:scale-95 transition-transform h-[52px]">
                    To'lash
                  </button>
                </form>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-8">
              <h3 className="font-bold text-gray-500 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <FileText size={16} /> Operatsiyalar Tarixi
              </h3>
              
              <div className="space-y-3 max-w-4xl">
                {history.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.type === 'debt' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                        {item.type === 'debt' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-lg">{item.comment || (item.type === 'debt' ? 'Nasiya' : 'To\'lov')}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                          <Calendar size={12} /> 
                          {new Date(item.date).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold text-xl ${item.type === 'debt' ? 'text-red-600' : 'text-green-600'}`}>
                      {item.type === 'debt' ? '+' : '-'}{item.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
                
                {history.length === 0 && <p className="text-gray-400 text-center py-10 italic">Hozircha tarix mavjud emas</p>}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Search size={64} className="mb-6 opacity-10" />
            <p className="text-lg font-medium">Tafsilotlarni ko'rish uchun ro'yxatdan qarzdorni tanlang</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtorsManagement;