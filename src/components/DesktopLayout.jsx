import React, { useState, Suspense, lazy } from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext';
import { useIpcListener } from '../hooks/useIpcListener';
import Sidebar from './Sidebar';
import TablesGrid from './TablesGrid';
import OrderSummary from './OrderSummary';
import PinLogin from './PinLogin';

// --- OPTIMIZATSIYA: Dangasa Yuklash (Lazy Loading) ---
// Bu komponentlar faqat kerak bo'lganda yuklanadi
const MenuManagement = lazy(() => import('./MenuManagement'));
const TablesManagement = lazy(() => import('./TablesManagement'));
const CustomersManagement = lazy(() => import('./CustomersManagement'));
const DebtorsManagement = lazy(() => import('./DebtorsManagement'));
const Reports = lazy(() => import('./Reports'));
const Settings = lazy(() => import('./Settings'));
const Marketing = lazy(() => import('./Marketing'));

// Yuklanayotganda ko'rsatiladigan chiroyli spinner
const PageLoader = () => (
  <div className="flex items-center justify-center h-full w-full bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const DesktopLayout = () => {
  const { user, logout, loading, toast, showToast } = useGlobal();
  const [activePage, setActivePage] = useState('pos');
  const [selectedTable, setSelectedTable] = useState(null);

  // Printer xatolarini global eshitish
  useIpcListener('db-change', (event, data) => {
      if (data.type === 'printer-error') {
          showToast('error', `Printer Xatosi: ${data.id}`); 
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
    // XAVFSIZLIK: Kassir cheklovi
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

    // Suspense orqali yuklanish holatini boshqaramiz
    return (
      <Suspense fallback={<PageLoader />}>
        {(() => {
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
        })()}
      </Suspense>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans relative">
      
      {/* Global Toast */}
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
      
      {/* Layout o'zgarishi: POS bo'lsa grid, boshqa bo'lsa to'liq ekran */}
      {activePage === 'pos' ? renderContent() : <div className="flex-1 flex overflow-hidden">{renderContent()}</div>}
    </div>
  );
};

export default DesktopLayout;