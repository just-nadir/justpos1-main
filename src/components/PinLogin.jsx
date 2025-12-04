import React, { useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext'; // YANGI

const PinLogin = () => {
  const { login } = useGlobal(); // Contextdan olish
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNumClick = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) return;

    setLoading(true);
    try {
      if (window.electron) {
        const { ipcRenderer } = window.electron;
        const user = await ipcRenderer.invoke('login', pin);
        
        // Ofitsiantlarni bloklash (Desktopda faqat Admin/Kassir)
        if (user.role === 'waiter') {
            setError("Ofitsiantlar mobil ilovadan foydalanishi kerak!");
            setPin('');
            return;
        }

        login(user); // Global Context orqali login qilish
      }
    } catch (err) {
      setError("PIN kod noto'g'ri!");
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Tizimga kirish</h1>
          <p className="text-gray-500 text-sm">Shaxsiy PIN kodingizni kiriting</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-center gap-4 mb-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-blue-600 scale-110' : 'bg-gray-200'}`}></div>
            ))}
          </div>
          <p className="h-6 text-center text-red-500 text-sm font-bold">{error}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} onClick={() => handleNumClick(num.toString())} className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-50 text-2xl font-bold text-gray-700 transition-colors shadow-sm border border-gray-100">{num}</button>
          ))}
          <div className="col-span-1"></div> 
          <button onClick={() => handleNumClick('0')} className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-50 text-2xl font-bold text-gray-700 transition-colors shadow-sm border border-gray-100">0</button>
          <button onClick={handleDelete} className="h-16 rounded-2xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 flex items-center justify-center transition-colors shadow-sm border border-red-100"><Delete size={24} /></button>
        </div>

        <button onClick={handleSubmit} disabled={pin.length !== 4 || loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">
          {loading ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
      </div>
    </div>
  );
};

export default PinLogin;