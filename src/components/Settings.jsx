import React, { useState, useEffect } from 'react';
import { Save, Printer, Database, Store, Receipt, Percent, RefreshCw, ChefHat, Plus, Trash2, Users, Shield, Key, Coins, CheckCircle, MessageSquare, Send } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [kitchens, setKitchens] = useState([]);
  const [users, setUsers] = useState([]); 
  const [smsTemplates, setSmsTemplates] = useState([]); // YANGI
  const [notification, setNotification] = useState(null); 
  
  const [newKitchen, setNewKitchen] = useState({ name: '', printer_ip: '192.168.1.', printer_port: 9100 });
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'waiter' }); 

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, type: null, id: null, message: '' });

  const [settings, setSettings] = useState({
    restaurantName: "", address: "", phone: "", wifiPassword: "",
    serviceChargeType: "percent", serviceChargeValue: 0, receiptFooter: "", 
    printerReceiptIP: "", printerReceiptPort: 9100
  });

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotify = (type, msg) => setNotification({ type, msg });

  const loadAllData = async () => {
     if (!window.require) return;
     try {
        const { ipcRenderer } = window.require('electron');
        const sData = await ipcRenderer.invoke('get-settings');
        setSettings(prev => ({
            ...prev, 
            ...sData, 
            serviceChargeValue: Number(sData.serviceChargeValue) || 0,
            printerReceiptPort: Number(sData.printerReceiptPort) || 9100 
        }));
        
        const kData = await ipcRenderer.invoke('get-kitchens');
        setKitchens(kData);

        const uData = await ipcRenderer.invoke('get-users');
        setUsers(uData);

        // YANGI: SMS Shablonlarni yuklash
        const smsData = await ipcRenderer.invoke('get-sms-templates');
        setSmsTemplates(smsData);

     } catch (err) { console.error(err); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('save-settings', settings);
        showNotify('success', "Sozlamalar saqlandi!");
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ... (Kitchen va User funksiyalari o'zgarishsiz qoladi) ...
  const handleSaveKitchen = async (e) => { e.preventDefault(); if(!newKitchen.name) return; try { const { ipcRenderer } = window.require('electron'); await ipcRenderer.invoke('save-kitchen', newKitchen); setNewKitchen({ name: '', printer_ip: '192.168.1.', printer_port: 9100 }); loadAllData(); showNotify('success', "Oshxona qo'shildi"); } catch (err) { console.error(err); } };
  const handleDeleteAction = async () => { try { const { ipcRenderer } = window.require('electron'); if (modal.type === 'kitchen') { await ipcRenderer.invoke('delete-kitchen', modal.id); } else if (modal.type === 'user') { await ipcRenderer.invoke('delete-user', modal.id); } else if (modal.type === 'mass-sms') { 
      // YANGI: Mass SMS yuborish
      setLoading(true);
      const res = await ipcRenderer.invoke('send-mass-sms', modal.id);
      setLoading(false);
      showNotify('success', `${res.sent} ta mijozga SMS yuborildi!`);
  } loadAllData(); if(modal.type !== 'mass-sms') showNotify('success', "O'chirildi"); } catch(err) { showNotify('error', err.message); setLoading(false); } };
  const confirmDeleteKitchen = (id) => { setModal({ isOpen: true, type: 'kitchen', id, message: "Oshxonani o'chirmoqchimisiz?" }); };
  const confirmDeleteUser = (id) => { setModal({ isOpen: true, type: 'user', id, message: "Xodimni o'chirmoqchimisiz?" }); };
  const handleSaveUser = async (e) => { e.preventDefault(); if (!newUser.name || !newUser.pin) return; try { const { ipcRenderer } = window.require('electron'); await ipcRenderer.invoke('save-user', newUser); setNewUser({ name: '', pin: '', role: 'waiter' }); loadAllData(); showNotify('success', "Xodim saqlandi!"); } catch (err) { showNotify('error', err.message); } };
  const handleBackupClick = () => { setModal({ isOpen: true, type: 'backup', id: null, message: "Ma'lumotlar bazasidan nusxa olinsinmi?" }); };
  
  // YANGI: SMS Shablonni saqlash
  const handleSaveTemplate = async (template) => {
      try {
          const { ipcRenderer } = window.require('electron');
          await ipcRenderer.invoke('save-sms-template', template);
          showNotify('success', "Shablon yangilandi");
      } catch (err) { showNotify('error', err.message); }
  };

  const confirmMassSms = (id) => {
      setModal({ isOpen: true, type: 'mass-sms', id, message: "Barcha mijozlarga ushbu xabarni yubormoqchimisiz? Bu jarayon biroz vaqt olishi mumkin." });
  };

  const getRoleBadge = (role) => {
      switch(role) {
          case 'admin': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold uppercase">Admin</span>;
          case 'cashier': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold uppercase">Kassir</span>;
          default: return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">Ofitsiant</span>;
      }
  }

  return (
    <div className="flex w-full h-full bg-gray-100 relative">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`absolute top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-white font-bold animate-in slide-in-from-top duration-300 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
           {notification.type === 'success' ? <CheckCircle size={20}/> : <Shield size={20}/>}
           {notification.msg}
        </div>
      )}

      <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full p-4 shadow-sm z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">Sozlamalar</h2>
        <div className="space-y-2">
          <button onClick={() => setActiveTab('general')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'general' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Store size={20} /> Umumiy Ma'lumot</button>
          <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Users size={20} /> Xodimlar</button>
          <button onClick={() => setActiveTab('sms')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'sms' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><MessageSquare size={20} /> SMS Marketing</button>
          <button onClick={() => setActiveTab('order')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'order' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Percent size={20} /> Buyurtma va Xizmat</button>
          <button onClick={() => setActiveTab('kitchens')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'kitchens' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><ChefHat size={20} /> Oshxonalar & LAN</button>
          <button onClick={() => setActiveTab('printers')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'printers' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Printer size={20} /> Kassa Printeri</button>
          <button onClick={() => setActiveTab('database')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'database' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Database size={20} /> Baza va Tizim</button>
        </div>
        <div className="mt-auto">
          <button onClick={handleSaveSettings} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70">
             {loading ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />} Saqlash
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'general' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Store size={20} className="text-blue-500"/> Restoran Ma'lumotlari</h3>
              <div className="grid gap-4">
                <div><label className="block text-sm font-bold text-gray-500 mb-1">Restoran Nomi</label><input type="text" name="restaurantName" value={settings.restaurantName || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-bold text-gray-700" /></div>
                <div><label className="block text-sm font-bold text-gray-500 mb-1">Manzil</label><input type="text" name="address" value={settings.address || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" /></div>
                <div><label className="block text-sm font-bold text-gray-500 mb-1">Telefon</label><input type="text" name="phone" value={settings.phone || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" /></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Receipt size={20} className="text-orange-500"/> Chek Sozlamalari</h3>
               <div><label className="block text-sm font-bold text-gray-500 mb-1">Chekosti yozuvi</label><textarea rows="3" name="receiptFooter" value={settings.receiptFooter || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 resize-none"></textarea></div>
            </div>
          </div>
        )}

        {/* YANGI: SMS MARKETING TAB */}
        {activeTab === 'sms' && (
            <div className="max-w-3xl space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-800 text-sm">
                    <p className="font-bold mb-1">Eslatma:</p>
                    <p>SMS xabarlarida <b>{`{name}`}</b> (mijoz ismi), <b>{`{amount}`}</b> (qarz summasi) va <b>{`{restaurant}`}</b> (restoran nomi) kabi o'zgaruvchilardan foydalanishingiz mumkin.</p>
                </div>

                {smsTemplates.map(tpl => (
                    <div key={tpl.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <MessageSquare size={20} className="text-green-500"/> {tpl.title}
                            </h3>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-gray-500">Avtomatik yuborish:</label>
                                <input 
                                    type="checkbox" 
                                    checked={tpl.is_active === 1} 
                                    onChange={(e) => {
                                        const updated = {...tpl, is_active: e.target.checked ? 1 : 0};
                                        setSmsTemplates(prev => prev.map(p => p.id === tpl.id ? updated : p));
                                        handleSaveTemplate(updated);
                                    }}
                                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                                />
                            </div>
                        </div>
                        
                        <textarea 
                            rows="3" 
                            value={tpl.template} 
                            onChange={(e) => {
                                const updated = {...tpl, template: e.target.value};
                                setSmsTemplates(prev => prev.map(p => p.id === tpl.id ? updated : p));
                            }}
                            onBlur={() => handleSaveTemplate(tpl)}
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 resize-none text-sm font-medium text-gray-700"
                        ></textarea>

                        {tpl.type === 'new_dish' && (
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={() => confirmMassSms(tpl.id)}
                                    disabled={loading}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Yuborilmoqda...' : <><Send size={16} /> Barcha mijozlarga yuborish</>}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'users' && (
            <div className="max-w-3xl space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Users size={20} className="text-blue-500"/> Xodim Qo'shish</h3>
                    <form onSubmit={handleSaveUser} className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Ism</label>
                            <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Ali" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-bold" />
                        </div>
                        <div className="col-span-3">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">PIN Kod</label>
                            <div className="relative">
                                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input required type="text" maxLength="4" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value.replace(/\D/g,'')})} placeholder="1234" className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-mono text-center tracking-widest" />
                            </div>
                        </div>
                        <div className="col-span-3">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Rol</label>
                            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500">
                                <option value="waiter">Ofitsiant</option>
                                <option value="cashier">Kassir</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">Qo'shish</button>
                        </div>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Xodimlar Ro'yxati</h3>
                    <div className="space-y-2">
                        {users.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white 
                                        ${u.role === 'admin' ? 'bg-purple-500' : u.role === 'cashier' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                        {u.role === 'admin' ? <Shield size={18} /> : u.role === 'cashier' ? <Coins size={18} /> : <Users size={18} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{u.name}</p>
                                        <p className="text-xs text-gray-500 font-mono flex items-center gap-1">PIN: ••••</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getRoleBadge(u.role)}
                                    <button onClick={() => confirmDeleteUser(u.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={20}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* ... (Qolgan tablar - order, kitchens, printers, database - o'zgarishsiz qoladi) ... */}
        {activeTab === 'order' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Percent size={20} className="text-green-500"/> Xizmat Haqi (Service Charge)</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <button onClick={() => setSettings({...settings, serviceChargeType: 'percent'})} className={`p-4 rounded-xl border-2 font-bold transition-all ${settings.serviceChargeType === 'percent' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50'}`}>Foiz (%) da</button>
                 <button onClick={() => setSettings({...settings, serviceChargeType: 'fixed'})} className={`p-4 rounded-xl border-2 font-bold transition-all ${settings.serviceChargeType === 'fixed' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50'}`}>Kishi boshiga (Fixed)</button>
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">{settings.serviceChargeType === 'percent' ? 'Xizmat foizi' : 'Kishi boshiga summa'}</label>
                  <div className="relative">
                    <input type="number" name="serviceChargeValue" value={settings.serviceChargeValue || 0} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-bold text-xl" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{settings.serviceChargeType === 'percent' ? '%' : "so'm"}</div>
                  </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kitchens' && (
          <div className="max-w-3xl space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={20} className="text-blue-500"/> Yangi Oshxona Qo'shish</h3>
                <form onSubmit={handleSaveKitchen} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-4">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nomi</label>
                        <input required type="text" value={newKitchen.name} onChange={e => setNewKitchen({...newKitchen, name: e.target.value})} placeholder="Masalan: Bar" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-bold" />
                    </div>
                    <div className="col-span-5">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">LAN Printer IP</label>
                        <input type="text" value={newKitchen.printer_ip} onChange={e => setNewKitchen({...newKitchen, printer_ip: e.target.value})} placeholder="192.168.1.200" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-mono" />
                    </div>
                    <div className="col-span-3">
                        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">Saqlash</button>
                    </div>
                </form>
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><ChefHat size={20} className="text-orange-500"/> Oshxonalar Ro'yxati</h3>
                <div className="space-y-3">
                   {kitchens.map(k => (
                       <div key={k.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 group">
                          <div>
                             <p className="font-bold text-gray-800 text-lg">{k.name}</p>
                             <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
                                <Printer size={12} /> {k.printer_ip ? `IP: ${k.printer_ip}:${k.printer_port}` : "Printer ulanmagan"}
                             </p>
                          </div>
                          <button onClick={() => confirmDeleteKitchen(k.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={20}/></button>
                       </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'printers' && (
          <div className="max-w-2xl space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Printer size={20} className="text-purple-500"/> Kassa Printeri</h3>
                <p className="text-sm text-gray-400 mb-6">Mijozga beriladigan chek uchun asosiy printer (LAN).</p>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                        <p className="font-bold text-gray-700">Printer IP Manzili</p>
                        <p className="text-xs text-gray-400">Masalan: 192.168.1.100</p>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            name="printerReceiptIP" 
                            value={settings.printerReceiptIP || ''} 
                            onChange={handleChange} 
                            className="p-2 rounded-lg border border-gray-300 outline-none text-sm w-32 font-mono text-center" 
                            placeholder="192.168.1.100" 
                        />
                        <input 
                            type="number" 
                            name="printerReceiptPort" 
                            value={settings.printerReceiptPort || 9100} 
                            onChange={handleChange} 
                            className="p-2 rounded-lg border border-gray-300 outline-none text-sm w-20 font-mono text-center" 
                            placeholder="9100" 
                        />
                    </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="max-w-2xl space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><Database size={20} className="text-red-500"/> Ma'lumotlar Bazasi</h3>
                <p className="text-sm text-gray-500 mb-6">Ehtiyot bo'ling! Ma'lumotlarni yo'qotmaslik uchun tez-tez nusxa olib turing.</p>
                <div className="flex gap-4">
                   <button onClick={handleBackupClick} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"><Save size={18} /> Backup (Nusxa olish)</button>
                </div>
             </div>
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({ ...modal, isOpen: false })} 
        onConfirm={handleDeleteAction} 
        message={modal.message}
        title="Tasdiqlang"
      />
    </div>
  );
};

export default Settings;