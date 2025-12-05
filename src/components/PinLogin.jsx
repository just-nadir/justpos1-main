import React, { useState, useEffect } from 'react';
import { Delete, Lock } from 'lucide-react';

const PinLogin = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // DEBUG: Komponent har safar yangilanganda holatni ko'rsatish
  useEffect(() => {
    console.log(`[PinLogin Holati] PIN: "${pin}" | Uzunlik: ${pin.length} | Loading: ${loading}`);
  }, [pin, loading]);

  const handleNumClick = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError('');
    } else {
        console.warn("PIN kiritish bloklandi: Maksimal uzunlik (4) ga yetdi");
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async (e) => {
    // 1. Tugma bosilishini tekshirish
    if (e) e.preventDefault();
    console.log(">>> KIRISH TUGMASI BOSILDI <<<");

    // 2. Validatsiya loglari
    if (pin.length !== 4) {
        console.error(`XATOLIK: PIN uzunligi noto'g'ri. Kutilmoqda: 4, Mavjud: ${pin.length}`);
        return;
    }
    if (loading) {
        console.warn("OGOHLANTIRISH: So'rov allaqachon yuborilgan (Loading: true)");
        return;
    }

    setLoading(true);
    console.log("Serverga so'rov yuborilmoqda...");

    try {
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        
        // 3. Backend javobini kutish
        console.log(`IPC 'login' chaqirilmoqda. PIN: ${pin}`);
        const user = await ipcRenderer.invoke('login', pin);
        console.log("Backend javobi:", user);
        
        // 4. Ofitsiant tekshiruvi
        if (user.role === 'waiter') {
            console.warn("Login rad etildi: Ofitsiant roli");
            setError("Ofitsiantlar mobil ilovadan foydalanishi kerak!");
            setPin('');
            return;
        }

        // 5. onLogin funksiyasini tekshirish
        if (typeof onLogin === 'function') {
            console.log("Muvaffaqiyatli! onLogin() chaqirilmoqda...");
            onLogin(user); 
        } else {
            console.error("KRITIK XATO: onLogin funksiyasi mavjud emas! (Parent komponentni tekshiring)");
            setError("Tizim xatoligi: onLogin funksiyasi topilmadi");
        }
      } else {
          console.error("Electron muhiti topilmadi (window.require yo'q)");
          setError("Faqat Electron muhitida ishlaydi");
      }
    } catch (err) {
      console.error("CATCH XATOLIK:", err);
      // Agar xato backenddan kelsa
      const message = err.message && err.message.includes("PIN") ? "PIN kod noto'g'ri!" : err.message;
      setError(message);
      setPin('');
    } finally {
      setLoading(false);
      console.log("Jarayon yakunlandi (Loading: false)");
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
          <p className="h-6 text-center text-red-500 text-sm font-bold animate-pulse">{error}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} onClick={() => handleNumClick(num.toString())} className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-50 text-2xl font-bold text-gray-700 transition-colors shadow-sm border border-gray-100">{num}</button>
          ))}
          <div className="col-span-1"></div> 
          <button onClick={() => handleNumClick('0')} className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-50 text-2xl font-bold text-gray-700 transition-colors shadow-sm border border-gray-100">0</button>
          <button onClick={handleDelete} className="h-16 rounded-2xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 flex items-center justify-center transition-colors shadow-sm border border-red-100"><Delete size={24} /></button>
        </div>

        <button 
            onClick={handleSubmit} 
            disabled={pin.length !== 4 || loading} 
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          {loading ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
      </div>
    </div>
  );
};

export default PinLogin;