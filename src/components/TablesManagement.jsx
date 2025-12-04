import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Layout, Square, Armchair, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

// --- MODAL KOMPONENT ---
const TableModal = ({ isOpen, onClose, onSubmit, newTableName, setNewTableName, activeHallName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-white w-[400px] rounded-2xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Yangi Stol</h2>
        <p className="text-sm text-gray-500 mb-6">Zal: <span className="font-bold text-blue-600">{activeHallName}</span></p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stol Nomi</label>
            <input autoFocus required type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" placeholder="Stol 15" />
          </div>
          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 mt-2">Saqlash</button>
        </form>
      </div>
    </div>
  );
};

// --- ASOSIY ---
const TablesManagement = () => {
  const [halls, setHalls] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeHall, setActiveHall] = useState(null);
  
  const [isAddingHall, setIsAddingHall] = useState(false);
  const [newHallName, setNewHallName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');

  // Delete Modal State
  const [modal, setModal] = useState({ isOpen: false, type: null, id: null, message: '' });

  const loadHalls = async () => {
    if (!window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      const data = await ipcRenderer.invoke('get-halls');
      setHalls(data);
      if (!activeHall && data.length > 0) setActiveHall(data[0].id);
    } catch (err) { console.error(err); }
  };

  const loadTables = async () => {
    if (!activeHall || !window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      const data = await ipcRenderer.invoke('get-tables-by-hall', activeHall);
      setTables(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadHalls(); }, []);
  useEffect(() => { loadTables(); }, [activeHall]);

  const handleAddHall = async (e) => {
    e.preventDefault();
    if (!newHallName.trim()) return;
    const { ipcRenderer } = window.electron;
    await ipcRenderer.invoke('add-hall', newHallName);
    setNewHallName('');
    setIsAddingHall(false);
    loadHalls();
  };

  const confirmDeleteHall = (id) => {
      setModal({ isOpen: true, type: 'hall', id, message: "Zal va stollar o'chirilsinmi?" });
  };

  const confirmDeleteTable = (id) => {
      setModal({ isOpen: true, type: 'table', id, message: "Stol o'chirilsinmi?" });
  };

  const performDelete = async () => {
    try {
      const { ipcRenderer } = window.electron;
      if (modal.type === 'hall') {
          await ipcRenderer.invoke('delete-hall', modal.id);
          if (activeHall === modal.id) setActiveHall(null);
          loadHalls();
      } else if (modal.type === 'table') {
          await ipcRenderer.invoke('delete-table', modal.id);
          loadTables();
      }
    } catch(err) { console.error(err); }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTableName.trim() || !activeHall) return;
    try {
      const { ipcRenderer } = window.electron;
      await ipcRenderer.invoke('add-table', { hallId: activeHall, name: newTableName });
      setIsModalOpen(false);
      setNewTableName('');
      loadTables();
    } catch (err) { console.error(err); }
  };

  const activeHallObj = halls.find(h => h.id === activeHall);

  return (
    <div className="flex w-full h-full relative">
      {/* 2-QISM: ZALLAR */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Zallar</h2>
          <button onClick={() => setIsAddingHall(true)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Plus size={20} /></button>
        </div>
        
        {isAddingHall && (
          <form onSubmit={handleAddHall} className="p-4 bg-gray-50 border-b border-gray-100 animate-in slide-in-from-top">
            <input autoFocus type="text" placeholder="Zal nomi..." value={newHallName} onChange={(e) => setNewHallName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 mb-2 text-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsAddingHall(false)} className="text-xs text-gray-500 py-1 flex-1">Bekor</button>
              <button type="submit" className="text-xs bg-blue-600 text-white py-1 rounded-md flex-1">Qo'shish</button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {halls.map(hall => (
            <div key={hall.id} className="relative group">
              <button onClick={() => setActiveHall(hall.id)}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors flex justify-between items-center ${activeHall === hall.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                {hall.name}
              </button>
              <button onClick={() => confirmDeleteHall(hall.id)} className={`absolute right-2 top-2.5 p-1 text-gray-300 hover:text-red-200 opacity-0 group-hover:opacity-100 ${activeHall === hall.id ? 'hover:text-red-200' : 'hover:text-red-500'}`}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* 3-QISM: STOLLAR */}
      <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="bg-white px-8 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">Stollar</h1>
          {activeHall && (
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus size={20} /> Yangi Stol
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeHall ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables.map(table => (
                <div key={table.id} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-400 transition-all group flex flex-col items-center justify-center text-center relative aspect-[4/3]">
                  <div className="mb-2 text-blue-100 group-hover:text-blue-500 transition-colors"><Square size={40} /></div>
                  <h3 className="font-bold text-gray-800 text-lg mb-1">{table.name}</h3>
                  <div className="text-gray-400 text-xs flex items-center gap-1">
                     <Armchair size={12} /> Standard
                  </div>

                  <button onClick={() => confirmDeleteTable(table.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                </div>
              ))}
              {tables.length === 0 && <div className="col-span-full text-center text-gray-400 py-20 border-2 border-dashed rounded-2xl"><Layout size={40} className="mx-auto mb-2 opacity-20"/>Stollar yo'q</div>}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400"><Layout size={60} className="mb-4 opacity-20" /><p>Zalni tanlang</p></div>
          )}
        </div>
      </div>

      <TableModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddTable} newTableName={newTableName} setNewTableName={setNewTableName} activeHallName={activeHallObj?.name} />
      
      <ConfirmModal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({ ...modal, isOpen: false })} 
        onConfirm={performDelete} 
        message={modal.message}
      />
    </div>
  );
};

export default TablesManagement;