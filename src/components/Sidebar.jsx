import React from 'react';
import { LayoutGrid, UtensilsCrossed, Settings, LogOut, Square, Users, FileText, PieChart } from 'lucide-react';

const Sidebar = ({ activePage, onNavigate, onLogout, user }) => {
  const menuItems = [
    { id: 'pos', icon: <LayoutGrid size={24} />, label: "Kassa" },
    { id: 'menu', icon: <UtensilsCrossed size={24} />, label: "Menyu" },
    { id: 'tables', icon: <Square size={24} />, label: "Zallar" },
    { id: 'customers', icon: <Users size={24} />, label: "Mijozlar" },
    { id: 'debtors', icon: <FileText size={24} />, label: "Qarzdorlar" },
    { id: 'reports', icon: <PieChart size={24} />, label: "Xisobotlar" },
    { id: 'settings', icon: <Settings size={24} />, label: "Sozlamalar" },
  ];

  // Ruxsatlar mantiqi
  const filteredItems = menuItems.filter(item => {
    // Admin: Hammasi
    if (user?.role === 'admin') return true; 
    
    // Kassir: Faqat Kassa, Mijozlar, Qarzdorlar
    if (user?.role === 'cashier') {
        return ['pos', 'customers', 'debtors'].includes(item.id);
    }

    return false; // Boshqalarga hech narsa yo'q
  });

  return (
    <div className="w-24 bg-white h-screen flex flex-col items-center py-4 shadow-lg z-10">
      <div 
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-8 
          ${user?.role === 'admin' ? 'bg-purple-600' : user?.role === 'cashier' ? 'bg-orange-600' : 'bg-blue-600'}`} 
        title={user?.name + ` (${user?.role})`}
      >
        {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
      </div>

      <div className="flex-1 flex flex-col gap-4 w-full px-2">
        {filteredItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 group
              ${activePage === item.id 
                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
          >
            <div className="mb-1">{item.icon}</div>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 w-full px-2 mb-4">
        <button 
          onClick={onLogout} 
          className="flex flex-col items-center justify-center p-3 text-red-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          title="Chiqish"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;