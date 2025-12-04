import React, { useState, useEffect } from 'react';
import { Users, Clock, Receipt, Hash, User } from 'lucide-react';

const TablesGrid = ({ onSelectTable }) => {
  const [tables, setTables] = useState([]);
  const [halls, setHalls] = useState([]);
  const [activeHallId, setActiveHallId] = useState('all'); 
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      if (window.electron && window.electron.ipcRenderer) {
        const hallsData = await window.electron.ipcRenderer.invoke('get-halls');
        setHalls(hallsData);
        const tablesData = await window.electron.ipcRenderer.invoke('get-tables');
        setTables(tablesData);
      }
      setLoading(false);
    } catch (error) {
      console.error("Xatolik:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    let cleanup = () => {};
    if (window.electron && window.electron.ipcRenderer) {
        cleanup = window.electron.ipcRenderer.on('db-change', (event, data) => {
            if (data.type === 'tables' || data.type === 'sales' || data.type === 'table-items') {
                loadData();
            }
        });
    }
    return () => cleanup();
  }, []);

  const filteredTables = tables.filter(table => {
    const isActiveStatus = table.status !== 'free'; 
    const isHallMatch = activeHallId === 'all' || table.hall_id === activeHallId;
    return isActiveStatus && isHallMatch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'bg-white border-l-4 border-blue-500';
      case 'payment': return 'bg-yellow-50 border-l-4 border-yellow-500';
      default: return 'bg-white';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'occupied': return <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">BAND</span>;
      case 'payment': return <span className="bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">TO'LOV</span>;
      default: return null;
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Yuklanmoqda...</div>;

  return (
    <div className="flex-1 bg-gray-50 h-screen flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="p-6 pb-2 bg-white shadow-sm z-10 shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Kassa</h1>
          <div className="text-right">
            <p className="font-bold text-lg text-gray-800">
               {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
            <p className="text-xs text-gray-500">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setActiveHallId('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${activeHallId === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Hammasi</button>
          {halls.map(hall => (
            <button key={hall.id} onClick={() => setActiveHallId(hall.id)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${activeHallId === hall.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{hall.name}</button>
          ))}
        </div>
      </div>

      {/* GRID */}
      <div className="p-6 overflow-y-auto pb-32">
        <p className="text-gray-500 mb-4 text-sm">Faol buyurtmalar: {filteredTables.length} ta</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <div 
              key={table.id} 
              onClick={() => onSelectTable(table)}
              // TUZATISH: h-auto va min-h berildi, flex layout to'g'irlandi
              className={`p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-auto min-h-[170px] ${getStatusColor(table.status)}`}
            >
              <div className="flex flex-col gap-2">
                
                {/* Tepasi: Nom va Status */}
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-gray-800 leading-tight">{table.name}</h3>
                  {getStatusBadge(table.status)}
                </div>

                {/* Info qatori: Chek raqami va Ofitsiant */}
                <div className="flex flex-wrap gap-2">
                  {table.current_check_number > 0 && (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-bold border border-gray-200">
                          <Hash size={10}/> {table.current_check_number}
                      </span>
                  )}
                  {table.waiter_name && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-bold border border-blue-100">
                          <User size={10}/> {table.waiter_name}
                      </span>
                  )}
                </div>

                {/* Vaqt va Mehmonlar */}
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                    <div className="flex items-center gap-1"><Clock size={12} /> {table.start_time || '--:--'}</div>
                    <div className="w-px h-3 bg-gray-300"></div>
                    <div className="flex items-center gap-1"><Users size={12} /> {table.guests}</div>
                </div>
              </div>

              {/* Pastki qism: Summa */}
              <div className="pt-3 border-t border-gray-100 flex justify-between items-end mt-2">
                <span className="text-gray-400 text-xs uppercase font-semibold">Jami</span>
                <span className="font-bold text-xl text-gray-800 leading-none">
                  {table.total_amount ? table.total_amount.toLocaleString() : 0}
                </span>
              </div>
            </div>
          ))}

          {filteredTables.length === 0 && (
             <div className="col-span-full py-20 text-center">
               <div className="inline-block p-4 rounded-full bg-gray-100 mb-3 text-gray-400"><Receipt size={32} /></div>
               <p className="text-gray-500">Bu zalda faol buyurtmalar yo'q</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablesGrid;