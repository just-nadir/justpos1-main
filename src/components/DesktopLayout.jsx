import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, X } from 'lucide-react'; // Ikonkalar qo'shildi
import { useGlobal } from '../context/GlobalContext';
import { useIpcListener } from '../hooks/useIpcListener'; // Hookni import qilamiz
import Sidebar from './Sidebar';
import TablesGrid from './TablesGrid';
import OrderSummary from './OrderSummary';
import MenuManagement from './MenuManagement';
import TablesManagement from './TablesManagement';
import CustomersManagement from './CustomersManagement';
import DebtorsManagement from './DebtorsManagement';
import Reports from './Reports';
import Settings from './Settings';
import Marketing from './Marketing'; 
import PinLogin from './PinLogin';

const DesktopLayout = () => {
  const { user, logout, loading, toast, showToast } = useGlobal(); // showToast oldik
  const [activePage, setActivePage] = useState('pos');
  const [selectedTable, setSelectedTable] = useState(null);

  // YANGI: Printer xatolarini global eshitish
  useIpcListener('db-change', (event, data) => {
      // Agar backenddan 'printer-error' kelsa
      if (data.type === 'printer-error') {
          showToast('error', `Printer Xatosi: ${data.id}`); // data.id ichida xabar matni bo'ladi
          // Ovozli signal (beep) ham qo'shish mumkin
      }
  });

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500 font-bold bg-gray-100">Tizim yuklanmoqda...</div>;
  }

  if (!user) {
    return <PinLogin />;
  }

  const handleLogout = () => {
    logout();
    setSelectedTable(null);
    setActivePage('pos');
  };

  const renderContent = () => {
    if (user.role === 'cashier') {
        const allowed = ['pos', 'customers', 'debtors'];
        if (!allowed.includes(activePage)) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                   <ShieldAlert size={64} className="mb-4 text-orange-400" />
                   <h2 className="text-2xl font-bold text-gray-700">Ruxsat yo'q</h2>
                   <p>Siz faqat Kassa, Mijozlar va Qarzdorlar bo'limiga kira olasiz.</p>
                </div>
            );
        }
    }

    switch (activePage) {
      case 'pos':
        return (
          <>
            <TablesGrid onSelectTable={setSelectedTable} />
            <OrderSummary table={selectedTable} onDeselect={() => setSelectedTable(null)} />
          </>
        );
      case 'menu': return <MenuManagement />;
      case 'tables': return <TablesManagement />;
      case 'customers': return <CustomersManagement />;
      case 'debtors': return <DebtorsManagement />;
      case 'reports': return <Reports />;
      case 'marketing': return <Marketing />;
      case 'settings': return <Settings />;
      default: return <div>Sahifa topilmadi</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans relative">
      
      {/* YANGI: Global Toast UI */}
      {toast && (
        <div className={`absolute top-6 right-6 z-[9999] px-6 py-4 rounded-2xl shadow-2xl text-white font-bold flex items-center gap-3 animate-in slide-in-from-top duration-300 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
           {toast.type === 'success' ? <CheckCircle size={24}/> : <AlertTriangle size={24}/>} 
           <span className="text-lg">{toast.msg}</span>
        </div>
      )}

      <Sidebar 
        activePage={activePage} 
        onNavigate={setActivePage} 
        onLogout={handleLogout} 
        user={user} 
      />
      {activePage === 'pos' ? renderContent() : <div className="flex-1 flex overflow-hidden">{renderContent()}</div>}
    </div>
  );
};

export default DesktopLayout;