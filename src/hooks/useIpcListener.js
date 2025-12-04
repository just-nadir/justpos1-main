import { useEffect, useRef } from 'react';

/**
 * Electrondan keladigan xabarlarni tinglash uchun maxsus Hook.
 * Komponent o'chganda (unmount) listenerni avtomatik tozalaydi.
 * * @param {string} channel - Tinglanadigan kanal nomi (masalan: 'db-change')
 * @param {function} listener - Bajariladigan funksiya
 */
export const useIpcListener = (channel, listener) => {
  // Listener funksiyasini useRef da saqlaymiz, shunda u o'zgarganda 
  // useEffect qayta ishga tushib ketmaydi (re-render optimization).
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = listener;
  }, [listener]);

  useEffect(() => {
    // Agar Electron muhitida bo'lmasak, hech narsa qilmaymiz
    if (!window.electron) return;

    // Haqiqiy event handler
    const eventHandler = (event, ...args) => {
      if (savedHandler.current) {
        savedHandler.current(event, ...args);
      }
    };

    // Obuna bo'lish (Subscribe)
    // preload.cjs dagi 'on' funksiyasi bizga 'unsubscribe' funksiyasini qaytaradi
    const removeListener = window.electron.ipcRenderer.on(channel, eventHandler);

    // Tozalash (Cleanup) - Komponent o'chganda avtomatik ishlaydi
    return () => {
      if (removeListener) removeListener();
    };
  }, [channel]); // Faqat kanal nomi o'zgarganda qayta ishlaydi
};