import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import Sidebar from './Sidebar';
import TablesGrid from './TablesGrid';
import OrderSummary from './OrderSummary';
import MenuManagement from './MenuManagement';
import TablesManagement from './TablesManagement';
import CustomersManagement from './CustomersManagement';
import DebtorsManagement from './DebtorsManagement';
import Reports from './Reports';
import Settings from './Settings';
import PinLogin from './PinLogin';

const DesktopLayout = () => {
  const [user, setUser] = useState(null); 
  const [activePage, setActivePage] = useState('pos');
  const [selectedTable, setSelectedTable] = useState(null);

  if (!user) {
    return <PinLogin onLogin={(loggedInUser) => setUser(loggedInUser)} />;
  }

  const handleLogout = () => {
    setUser(null);
    setSelectedTable(null);
    setActivePage('pos');
  };

  const renderContent = () => {
    // XAVFSIZLIK: Kassir uchun taqiqlangan sahifalar
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
      case 'settings': return <Settings />;
      default: return <div>Sahifa topilmadi</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
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