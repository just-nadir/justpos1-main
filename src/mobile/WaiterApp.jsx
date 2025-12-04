import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Clock, ChevronLeft, ShoppingBag, Trash2, Plus, Minus, CheckCircle, X, LogOut, User, AlertTriangle } from 'lucide-react';

// Hooks
import { useSocketData } from '../hooks/useSocketData';
import { useCart } from '../hooks/useCart';
import { useMenu } from '../hooks/useMenu';
import MobilePinLogin from './MobilePinLogin'; 
import ConfirmModal from '../components/ConfirmModal'; // Desktopdagini ishlatamiz

const WaiterApp = () => {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('tables'); 
  const [activeTable, setActiveTable] = useState(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestCount, setGuestCount] = useState(2); 
  
  // Modals & Notifications
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showConfirmOrder, setShowConfirmOrder] = useState(false);
  const [toast, setToast] = useState(null); // {type: 'success'|'error', msg: ''}

  const { tables, serviceType, loadTables, API_URL } = useSocketData();
  const { cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount } = useCart();
  const { categories, products, activeCategory, setActiveCategory, loading, loadMenu } = useMenu(API_URL);

  useEffect(() => {
      if(toast) {
          const timer = setTimeout(() => setToast(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [toast]);

  if (!user) {
    return <MobilePinLogin apiUrl={API_URL} onLogin={(u) => setUser(u)} />;
  }

  const handleLogout = () => {
      setUser(null);
      setView('tables');
      setShowConfirmLogout(false);
  };

  const handleTableClick = (table) => {
    if (table.status === 'free') {
        setActiveTable(table);
        setGuestCount(2); 
        setShowGuestModal(true);
    } else {
        setActiveTable(table);
        openMenu(table);
    }
  };

  const confirmGuestCount = () => {
    if (!activeTable) return;
    const updatedTable = { ...activeTable, guests: guestCount };
    setActiveTable(updatedTable);
    openMenu(updatedTable);
    setShowGuestModal(false);
  };

  const openMenu = (table) => {
    clearCart();
    setView('menu');
    loadMenu();
  };

  const sendOrder = async () => {
    if (!activeTable || cart.length === 0) return;
    
    try {
      await axios.post(`${API_URL}/tables/guests`, {
          tableId: activeTable.id,
          count: activeTable.guests 
      });

      await axios.post(`${API_URL}/orders/bulk-add`, {
          tableId: activeTable.id,
          items: cart,
          waiterId: user.id 
      });
      
      setToast({ type: 'success', msg: "Buyurtma qabul qilindi!" });
      clearCart();
      setView('tables');
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', msg: "Internetni tekshiring" });
    }
    setShowConfirmOrder(false);
  };

  const handleBack = () => {
      setActiveTable(null);
      setView('tables');
  };

  const updateGuestsInMenu = () => {
      setGuestCount(activeTable.guests || 2);
      setShowGuestModal(true);
  };

  const GuestModal = () => {
      if (!showGuestModal) return null;
      return (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">Necha kishi?</h2>
                      <button onClick={() => setShowGuestModal(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-8 border border-gray-100">
                      <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="w-14 h-14 bg-white rounded-xl shadow-sm text-3xl font-bold text-blue-600 active:scale-90 flex items-center justify-center border border-gray-200">-</button>
                      <span className="text-6xl font-bold text-gray-800 w-24 text-center">{guestCount}</span>
                      <button onClick={() => setGuestCount(guestCount + 1)} className="w-14 h-14 bg-blue-600 rounded-xl shadow-lg text-3xl font-bold text-white active:scale-90 flex items-center justify-center">+</button>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-8">
                      {[1, 2, 3, 4, 5, 6, 8, 10].map(num => (
                          <button key={num} onClick={() => setGuestCount(num)} 
                            className={`py-3 rounded-xl font-bold text-lg transition-colors ${guestCount === num ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                              {num}
                          </button>
                      ))}
                  </div>

                  <button onClick={confirmGuestCount} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-xl shadow-xl active:scale-95 flex items-center justify-center gap-2">
                      Davom etish <ChevronLeft className="rotate-180" />
                  </button>
              </div>
          </div>
      )
  };

  // TABLES VIEW
  if (view === 'tables') {
    return (
      <div className="min-h-screen bg-gray-100 pb-20 relative">
        <GuestModal />
        
        {/* Toast */}
        {toast && (
            <div className={`fixed top-4 left-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-white font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
                {toast.type === 'success' ? <CheckCircle /> : <AlertTriangle />} {toast.msg}
            </div>
        )}

        <ConfirmModal 
            isOpen={showConfirmLogout}
            onClose={() => setShowConfirmLogout(false)}
            onConfirm={handleLogout}
            title="Chiqish"
            message="Tizimdan chiqmoqchimisiz?"
            confirmText="Ha, chiqish"
        />

        <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
                <User size={20} className="opacity-80"/> {user.name}
            </h1>
            <p className="text-xs text-blue-200">Ofitsiant Paneli</p>
          </div>
          <button onClick={() => setShowConfirmLogout(true)} className="p-2 bg-blue-500 rounded-full active:scale-95 text-white hover:bg-red-500 transition-colors">
              <LogOut size={20}/>
          </button>
        </div>

        <div className="p-3 grid grid-cols-2 gap-3">
          {tables.map(table => (
            <div key={table.id} onClick={() => handleTableClick(table)}
              className={`p-4 rounded-xl shadow-sm border-l-4 flex flex-col justify-between h-32 relative overflow-hidden transition-transform active:scale-95 bg-white
                ${table.status === 'occupied' ? 'border-blue-500' : 
                  table.status === 'payment' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'}`}
            >
              <div>
                 <h3 className="font-bold text-xl text-gray-800">{table.name}</h3>
                 <span className={`text-xs font-bold uppercase mt-1 inline-block px-2 py-0.5 rounded
                   ${table.status === 'occupied' ? 'bg-blue-100 text-blue-700' : 
                     table.status === 'payment' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                   {table.status === 'free' ? 'Bo\'sh' : table.status === 'occupied' ? 'Band' : 'To\'lov'}
                 </span>
              </div>
              <div className="flex items-end justify-between">
                 <div className="text-gray-400 text-xs flex items-center gap-1"><Users size={14} /> {table.guests}</div>
                 {table.total_amount > 0 && <div className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">{(table.total_amount).toLocaleString()}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // MENU & CART VIEW
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden relative">
      <GuestModal />
      
      {/* Confirm Order Modal */}
      <ConfirmModal 
          isOpen={showConfirmOrder}
          onClose={() => setShowConfirmOrder(false)}
          onConfirm={sendOrder}
          title="Buyurtmani tasdiqlash"
          message={`Jami: ${cartTotal.toLocaleString()} so'm. Yuboraymi?`}
          confirmText="Yuborish"
          isDanger={false}
      />

      <div className="bg-white p-3 shadow-sm border-b flex items-center gap-3 z-20">
        <button onClick={handleBack} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-lg leading-none">{activeTable?.name}</h2>
          <button onClick={updateGuestsInMenu} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-0.5 active:opacity-50">
             <Users size={12}/> {activeTable?.guests} mehmon
          </button>
        </div>
        {cartCount > 0 && (
           <button onClick={() => setView(view === 'cart' ? 'menu' : 'cart')} className={`p-2 rounded-full relative transition-colors ${view === 'cart' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>
              <ShoppingBag size={24} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{cartCount}</span>
           </button>
        )}
      </div>

      {view === 'cart' ? (
        <div className="flex-1 overflow-y-auto p-4 pb-32">
           <h2 className="font-bold text-xl mb-4 text-gray-800">Sizning buyurtmangiz</h2>
           {cart.length === 0 ? <p className="text-gray-400 text-center mt-10">Savatcha bo'sh</p> : (
             <div className="space-y-3">
               {cart.map(item => (
                 <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                    <div><h3 className="font-bold text-gray-800">{item.name}</h3><p className="text-blue-600 text-sm font-bold">{item.price.toLocaleString()} so'm</p></div>
                    <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg">
                       <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-red-500 active:scale-90"><Minus size={16}/></button>
                       <span className="font-bold text-lg w-4 text-center">{item.qty}</span>
                       <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-green-500 active:scale-90"><Plus size={16}/></button>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      ) : (
        <>
          <div className="bg-white border-b sticky top-0 z-10">
            <div className="flex overflow-x-auto p-2 gap-2 scrollbar-hide">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 pb-32">
            {loading ? <div className="text-center py-10 text-gray-400">Yuklanmoqda...</div> : (
              <div className="space-y-2">
                {products.filter(p => p.category_id === activeCategory).map(product => {
                  const inCart = cart.find(c => c.id === product.id);
                  return (
                    <div key={product.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform" onClick={() => addToCart(product)}>
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">🍽️</div>
                         <div><h3 className="font-bold text-gray-800">{product.name}</h3><p className="text-gray-500 text-sm">{product.price.toLocaleString()} so'm</p></div>
                      </div>
                      {inCart ? <div className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md">{inCart.qty}</div> : <button className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-blue-600"><Plus size={18} /></button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 safe-area-bottom">
           <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 text-sm font-medium">{cartCount} ta mahsulot</span>
              <span className="text-xl font-bold text-gray-900">{cartTotal.toLocaleString()} so'm</span>
           </div>
           {view === 'cart' ? (
             <button onClick={() => setShowConfirmOrder(true)} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">Buyurtmani Tasdiqlash</button>
           ) : (
             <button onClick={() => setView('cart')} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform">Savatchaga O'tish</button>
           )}
        </div>
      )}
    </div>
  );
};

export default WaiterApp;