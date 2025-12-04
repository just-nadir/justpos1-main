import React, { useState, useEffect } from 'react';
import { Users, Clock, Receipt } from 'lucide-react';

const TablesGrid = ({ onSelectTable }) => {
  const [tables, setTables] = useState([]);
  const [halls, setHalls] = useState([]);
  const [activeHallId, setActiveHallId] = useState('all'); 
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // YANGI: Xavfsiz ulanish (preload orqali)
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
    
    // --- YANGI: Faqat signal kelganda yangilash ---
    let cleanup = () => {};

    if (window.electron && window.electron.ipcRenderer) {
        // 'on' metodi bizning preload.cjs da tozalash funksiyasini qaytaradigan qilib yozilgan
        cleanup = window.electron.ipcRenderer.on('db-change', (event, data) => {
            // Agar stollar, savdo yoki buyurtma o'zgarsa - yangilaymiz
            if (data.type === 'tables' || data.type === 'sales' || data.type === 'table-items') {
                loadData();
            }
        });
    }

    // Komponent o'chganda listenerni o'chiramiz
    return () => {
        cleanup();
    };
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
      case 'occupied': return <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold">BAND</span>;
      case 'payment': return <span className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded text-xs font-bold">TO'LOV</span>;
      default: return null;
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Yuklanmoqda...</div>;

  return (
    <div className="flex-1 bg-gray-50 h-screen flex flex-col overflow-hidden">
      {/* HEADER va TABS */}
      <div className="p-6 pb-2 bg-white shadow-sm z-10">
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
          <button
            onClick={() => setActiveHallId('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap
              ${activeHallId === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Hammasi
          </button>
          
          {halls.map(hall => (
            <button
              key={hall.id}
              onClick={() => setActiveHallId(hall.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap
                ${activeHallId === hall.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {hall.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 overflow-y-auto pb-24">
        <p className="text-gray-500 mb-4 text-sm">Faol buyurtmalar: {filteredTables.length} ta</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <div 
              key={table.id} 
              onClick={() => onSelectTable(table)}
              className={`p-5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-40 ${getStatusColor(table.status)}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{table.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <Clock size={14} /> {table.start_time || '--:--'}
                    <span className="text-gray-300">|</span>
                    <Users size={14} /> {table.guests}
                  </div>
                </div>
                {getStatusBadge(table.status)}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-end mt-2">
                <span className="text-gray-500 text-sm">Jami:</span>
                <span className="font-bold text-xl text-gray-800">
                  {table.total_amount ? table.total_amount.toLocaleString() : 0}
                </span>
              </div>
            </div>
          ))}

          {filteredTables.length === 0 && (
             <div className="col-span-full py-20 text-center">
               <div className="inline-block p-4 rounded-full bg-gray-100 mb-3 text-gray-400">
                  <Receipt size={32} />
               </div>
               <p className="text-gray-500">Bu zalda faol buyurtmalar yo'q</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablesGrid;