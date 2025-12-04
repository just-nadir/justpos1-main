import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Ha, o'chirish", cancelText = "Bekor qilish", isDanger = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-white w-[400px] rounded-2xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            <AlertTriangle size={24} />
          </div>
          
          <h2 className="text-xl font-bold text-gray-800 mb-2">{title || "Tasdiqlang"}</h2>
          <p className="text-gray-500 mb-6 text-sm">{message || "Haqiqatan ham bu amalni bajarmoqchimisiz?"}</p>
          
          <div className="flex gap-3 w-full">
            <button 
              onClick={onClose} 
              className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors border border-gray-200"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }} 
              className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;