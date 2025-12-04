import { useState, useMemo } from 'react';

export const useCart = () => {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, qty: Math.max(0, item.qty - 1) } : item
    ).filter(item => item.qty > 0));
  };

  const clearCart = () => setCart([]);

  // Avtomatik hisoblash (useMemo - optimizatsiya uchun)
  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.qty), 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart]);

  return { cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount };
};