import React, { useState, useEffect } from 'react';
import { Mail, Settings, History, Send, Save, RefreshCw, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

const Marketing = () => {
  const [activeTab, setActiveTab] = useState('send');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Data States
  const [settings, setSettings] = useState({ eskiz_email: '', eskiz_password: '' });
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [newsMessage, setNewsMessage] = useState('');

  // --- LOADER ---
  const loadData = async () => {
    if (!window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      
      if (activeTab === 'config') {
          const s = await ipcRenderer.invoke('sms-get-settings');
          setSettings(prev => ({ ...prev, eskiz_email: s.email }));
      }
      
      if (activeTab === 'send') {
          const t = await ipcRenderer.invoke('sms-get-templates');
          setTemplates(t);
      }

      if (activeTab === 'history') {
          const h = await ipcRenderer.invoke('sms-get-history');
          setHistory(h);
      }

    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  useEffect(() => {
      if(toast) {
          const timer = setTimeout(() => setToast(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [toast]);

  // --- HANDLERS ---
  const handleSaveSettings = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          await window.electron.ipcRenderer.invoke('sms-save-settings', settings);
          setToast({ type: 'success', msg: "Sozlamalar saqlandi" });
          setSettings(p => ({...p, eskiz_password: ''})); // Xavfsizlik
      } catch (err) { setToast({ type: 'error', msg: "Xatolik" }); }
      setLoading(false);
  };

  const handleUpdateTemplate = async (type, text) => {
      try {
          await window.electron.ipcRenderer.invoke('sms-update-template', { type, template: text });
          setToast({ type: 'success', msg: "Shablon yangilandi" });
      } catch (err) { setToast({ type: 'error', msg: "Xatolik" }); }
  };

  const handleSendBroadcast = async () => {
      if (!newsMessage.trim()) return;
      if (!confirm("Barcha mijozlarga SMS yuborilsinmi? Bu pullik xizmat.")) return;
      
      setLoading(true);
      try {
          const res = await window.electron.ipcRenderer.invoke('sms-send-broadcast', newsMessage);
          setToast({ type: 'success', msg: `${res.count} ta xabar yuborildi` });
          setNewsMessage('');
      } catch (err) { setToast({ type: 'error', msg: "Xatolik yuz berdi" }); }
      setLoading(false);
  };

  // --- RENDERERS ---
  const renderConfig = () => (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-10">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Settings className="text-blue-600" /> Eskiz.uz Sozlamalari
          </h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">Email (Login)</label>
                  <input type="email" value={settings.eskiz_email} onChange={e => setSettings({...settings, eskiz_email: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" placeholder="example@mail.uz" />
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">Parol</label>
                  <input type="password" value={settings.eskiz_password} onChange={e => setSettings({...settings, eskiz_password: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" placeholder="********" />
              </div>
              <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                  {loading ? <RefreshCw className="animate-spin"/> : <Save size={20}/>} Saqlash
              </button>
          </form>
      </div>
  );

  const renderSend = () => (
      <div className="grid grid-cols-2 gap-6 h-full">
          {/* Shablonlar */}
          <div className="space-y-4 overflow-y-auto pr-2">
              <h3 className="font-bold text-gray-700">Avtomatik Shablonlar</h3>
              {templates.map(t => (
                  <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-gray-100 text-gray-600">
                              {t.type === 'birthday' ? "Tug'ilgan kun" : t.type === 'debt' ? "Qarz Eslatmasi" : "Yangilik"}
                          </span>
                      </div>
                      <textarea 
                          defaultValue={t.template} 
                          onBlur={(e) => handleUpdateTemplate(t.type, e.target.value)}
                          className="w-full p-3 bg-gray-50 rounded-xl border-none resize-none text-sm focus:ring-2 focus:ring-blue-100 h-24"
                      ></textarea>
                      <p className="text-[10px] text-gray-400 mt-1">
                          {t.type === 'birthday' ? "{name} - mijoz ismi." : 
                           t.type === 'debt' ? "{name} - ism, {amount} - summa." : 
                           "{dish_name} - taom nomi."}
                      </p>
                  </div>
              ))}
          </div>

          {/* Yangilik Yuborish */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Send size={20} className="text-green-500" /> Ommaviy Xabar (Yangilik)
              </h3>
              <p className="text-sm text-gray-500 mb-4">Barcha bazadagi mijozlarga SMS yuborish.</p>
              
              <textarea 
                  value={newsMessage}
                  onChange={(e) => setNewsMessage(e.target.value)}
                  placeholder="Yangi taomimizni tatib ko'ring..."
                  className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-green-500 h-40 mb-4 resize-none"
              ></textarea>
              
              <button onClick={handleSendBroadcast} disabled={loading || !newsMessage} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? "Yuborilmoqda..." : <><Send size={18} /> Yuborish</>}
              </button>
          </div>
      </div>
  );

  const renderHistory = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">So'nggi 100 ta xabar</h3>
              <button onClick={loadData} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><RefreshCw size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                      <tr>
                          <th className="p-3 rounded-l-lg">Sana</th>
                          <th className="p-3">Tel</th>
                          <th className="p-3">Xabar</th>
                          <th className="p-3">Tur</th>
                          <th className="p-3 rounded-r-lg text-right">Status</th>
                      </tr>
                  </thead>
                  <tbody className="text-sm">
                      {history.map(h => (
                          <tr key={h.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                              <td className="p-3 text-gray-500">{new Date(h.date).toLocaleString()}</td>
                              <td className="p-3 font-mono font-bold text-gray-700">{h.phone}</td>
                              <td className="p-3 text-gray-600 max-w-xs truncate" title={h.message}>{h.message}</td>
                              <td className="p-3">
                                  <span className="px-2 py-1 rounded text-[10px] bg-gray-100 text-gray-600 uppercase font-bold">{h.type}</span>
                              </td>
                              <td className="p-3 text-right">
                                  {h.status === 'sent' 
                                      ? <span className="text-green-600 font-bold flex items-center justify-end gap-1"><CheckCircle size={14}/> OK</span>
                                      : <span className="text-red-500 font-bold flex items-center justify-end gap-1"><AlertCircle size={14}/> Xato</span>}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              {history.length === 0 && <div className="text-center py-10 text-gray-400">Tarix bo'sh</div>}
          </div>
      </div>
  );

  return (
    <div className="flex w-full h-full bg-gray-100 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`absolute top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-2xl text-white font-bold flex items-center gap-3 animate-in slide-in-from-top ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
           {toast.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>} {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col p-4 z-10 shadow-sm">
        <h2 className="text-xl font-black text-gray-800 mb-6 px-2 flex items-center gap-2">
            <MessageSquare className="text-blue-600" /> SMS Marketing
        </h2>
        <div className="space-y-2">
            <button onClick={() => setActiveTab('send')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'send' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Send size={18} /> Yuborish & Shablon
            </button>
            <button onClick={() => setActiveTab('history')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                <History size={18} /> Tarix
            </button>
            <button onClick={() => setActiveTab('config')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'config' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Settings size={18} /> Sozlamalar
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-hidden h-screen flex flex-col">
          <div className="flex-1 min-h-0">
            {activeTab === 'send' && renderSend()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'config' && renderConfig()}
          </div>
      </div>
    </div>
  );
};

export default Marketing;