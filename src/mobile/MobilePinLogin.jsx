import React, { useState } from 'react';
import axios from 'axios';
import { Lock, Delete } from 'lucide-react';

const MobilePinLogin = ({ onLogin, apiUrl }) => {
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

  const handleSubmit = async () => {
    if (pin.length !== 4) return;

    setLoading(true);
    try {
      // Serverga so'rov yuboramiz
      const res = await axios.post(`${apiUrl}/login`, { pin });
      if (res.data) {
        onLogin(res.data); // Muvaffaqiyatli
      }
    } catch (err) {
      setError("Xato PIN kod!");
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-end pb-10">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-gray-700">
          <Lock size={32} className="text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Xush kelibsiz</h1>
        <p className="text-gray-400 text-sm">Ishni boshlash uchun kodingizni kiriting</p>
      </div>

      <div className="px-8 pb-8">
        {/* PIN DOTS */}
        <div className="flex justify-center gap-6 mb-8 h-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-blue-500 scale-125 shadow-[0_0_10px_#3b82f6]' : 'bg-gray-700'}`}></div>
          ))}
        </div>
        {error && <p className="text-red-500 text-center text-sm font-bold mb-4 animate-pulse">{error}</p>}

        {/* KEYPAD */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumClick(num.toString())}
              className="h-20 rounded-2xl bg-gray-800 active:bg-gray-700 text-3xl font-bold text-white transition-all shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
            >
              {num}
            </button>
          ))}
          <div className="col-span-1"></div>
          <button onClick={() => handleNumClick('0')} className="h-20 rounded-2xl bg-gray-800 active:bg-gray-700 text-3xl font-bold text-white transition-all shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1">0</button>
          <button onClick={handleDelete} className="h-20 rounded-2xl bg-gray-800 active:bg-red-900/30 text-red-400 flex items-center justify-center transition-all shadow-lg border-b-4 border-gray-950 active:border-b-0 active:translate-y-1">
            <Delete size={28} />
          </button>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={pin.length !== 4 || loading}
          className="w-full mt-6 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 shadow-xl shadow-blue-900/20"
        >
          {loading ? 'Kirilmoqda...' : 'Kirish'}
        </button>
      </div>
    </div>
  );
};

export default MobilePinLogin;