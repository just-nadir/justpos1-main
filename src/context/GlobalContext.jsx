import React, { createContext, useState, useContext, useEffect } from 'react';

// Context yaratamiz
const GlobalContext = createContext();

// Provider komponenti
export const GlobalProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Tizimga kirgan foydalanuvchi
  const [settings, setSettings] = useState({}); // Umumiy sozlamalar
  const [loading, setLoading] = useState(true);

  // Dastlabki yuklashlar
  useEffect(() => {
    const initApp = async () => {
      if (window.electron) {
        try {
          const loadedSettings = await window.electron.ipcRenderer.invoke('get-settings');
          setSettings(loadedSettings || {});
        } catch (err) {
          console.error("Global Context Init Error:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  // Login funksiyasi
  const login = (userData) => {
    setUser(userData);
  };

  // Logout funksiyasi
  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    settings,
    loading
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

// Hook (oson ishlatish uchun)
export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobal must be used within a GlobalProvider");
  }
  return context;
};