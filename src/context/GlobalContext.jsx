import React, { createContext, useState, useContext, useEffect } from 'react';

const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  
  // YANGI: Toast (Xabarnoma) uchun state
  const [toast, setToast] = useState(null);

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

  // YANGI: Toast ko'rsatish funksiyasi (3 soniyadan keyin o'chadi)
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    settings,
    loading,
    toast,      // Export qilamiz
    showToast   // Export qilamiz
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobal must be used within a GlobalProvider");
  }
  return context;
};