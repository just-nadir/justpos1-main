const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    // Backendga so'rov yuborish va javob kutish (Promise)
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    
    // Backenddan kelgan xabarlarni tinglash
    on: (channel, listener) => {
      const subscription = (event, ...args) => listener(event, ...args);
      ipcRenderer.on(channel, subscription);

      // Listenerni o'chirish uchun funksiya qaytaradi (React useEffect uchun qulay)
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },

    // Barcha listenerlarni o'chirish
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  }
});