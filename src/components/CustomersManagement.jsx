import React, { useState, useEffect } from 'react';
import { Plus, Trash2, User, Wallet, Percent, Users, Calendar, Gift, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

// --- MODAL KOMPONENT ---
const CustomerModal = ({ isOpen, onClose, onSubmit, newCustomer, setNewCustomer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-white w-[500px] rounded-2xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        
        <h2 className="text-xl font-bold text-gray-800 mb-6">Yangi Mijoz</h2>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ism Familiya</label>
                <input required type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" placeholder="Ali Valiyev" autoFocus />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input required type="text" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" placeholder="90 123 45 67" />
             </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Mijoz Turi</label>
             <div className="grid grid-cols-2 gap-3">
               <button type="button" onClick={() => setNewCustomer({...newCustomer, type: 'discount'})}
                 className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${newCustomer.type === 'discount' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                 <Percent size={20} /> <span className="font-bold">Chegirma (VIP)</span>
               </button>
               <button type="button" onClick={() => setNewCustomer({...newCustomer, type: 'cashback'})}
                 className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${newCustomer.type === 'cashback' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                 <Wallet size={20} /> <span className="font-bold">Bonus (Cashback)</span>
               </button>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
               {newCustomer.type === 'discount' ? 'Chegirma Foizi (%)' : 'Bonus Yig\'ish Foizi (%)'}
            </label>
            <input required type="number" value={newCustomer.value} onChange={e => setNewCustomer({...newCustomer, value: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" placeholder="Masalan: 5" />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Tug'ilgan kun (Ixtiyoriy)</label>
             <div className="relative">
               <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input type="date" value={newCustomer.birthday} onChange={e => setNewCustomer({...newCustomer, birthday: e.target.value})} className="w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" />
             </div>
          </div>

          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 mt-2">Saqlash</button>
        </form>
      </div>
    </div>
  );
};

// --- ASOSIY KOMPONENT ---
const CustomersManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [filterType, setFilterType] = useState('all'); // all, discount, cashback

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    type: 'cashback', // Default
    value: '',
    birthday: ''
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const loadData = async () => {
    if (!window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      const data = await ipcRenderer.invoke('get-customers');
      setCustomers(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const { ipcRenderer } = window.electron;
      await ipcRenderer.invoke('add-customer', { ...newCustomer, value: Number(newCustomer.value) });
      setIsModalOpen(false);
      setNewCustomer({ name: '', phone: '', type: 'cashback', value: '', birthday: '' });
      loadData();
    } catch (err) { console.error(err); }
  };

  const confirmDelete = (id) => {
      setConfirmModal({ isOpen: true, id });
  };

  const performDelete = async () => {
    try {
      const { ipcRenderer } = window.electron;
      await ipcRenderer.invoke('delete-customer', confirmModal.id);
      loadData();
    } catch(err) { console.error(err); }
  };

  // Filterlash logic
  const filteredCustomers = customers.filter(c => {
    if (filterType === 'all') return true;
    return c.type === filterType;
  });

  const getIcon = (type) => {
    return type === 'discount' 
      ? <Percent size={18} className="text-purple-600" /> 
      : <Wallet size={18} className="text-green-600" />;
  };

  return (
    <div className="flex w-full h-full relative">
      {/* 2-QISM: SIDEBAR FILTERS */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col shadow-sm z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">Guruhlar</h2>
        <div className="space-y-2">
          <button onClick={() => setFilterType('all')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${filterType === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
             <Users size={20} /> Hammasi
          </button>
          <button onClick={() => setFilterType('discount')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${filterType === 'discount' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}>
             <Percent size={20} /> Chegirmali (VIP)
          </button>
          <button onClick={() => setFilterType('cashback')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${filterType === 'cashback' ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-50'}`}>
             <Wallet size={20} /> Bonusli
          </button>
        </div>
      </div>

      {/* 3-QISM: CONTENT */}
      <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="bg-white px-8 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
          <h1 className="text-2xl font-bold text-gray-800">Mijozlar Bazasi</h1>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={20} /> Yangi Mijoz
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCustomers.map(customer => (
              <div key={customer.id} className="bg-white p-5 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-300 transition-all group relative">
                
                <div className="flex justify-between items-start mb-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center ${customer.type === 'discount' ? 'bg-purple-100' : 'bg-green-100'}`}>
                      {getIcon(customer.type)}
                   </div>
                   {customer.birthday && (
                     <div className="text-orange-400 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold" title="Tug'ilgan kun">
                        <Gift size={14} /> {new Date(customer.birthday).toLocaleDateString()}
                     </div>
                   )}
                </div>

                <h3 className="font-bold text-gray-800 text-lg mb-0.5">{customer.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{customer.phone}</p>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                   {customer.type === 'discount' ? (
                     <span className="text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded text-sm">{customer.value}% OFF</span>
                   ) : (
                     <div className="flex flex-col">
                       <span className="text-xs text-gray-400">Balans:</span>
                       <span className="text-green-600 font-bold">{customer.balance.toLocaleString()}</span>
                     </div>
                   )}
                </div>

                <button onClick={() => confirmDelete(customer.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddCustomer} newCustomer={newCustomer} setNewCustomer={setNewCustomer} />
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})} 
        onConfirm={performDelete} 
        message="Mijozni o'chirmoqchimisiz?"
      />
    </div>
  );
};

export default CustomersManagement;