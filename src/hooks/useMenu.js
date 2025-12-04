import { useState } from 'react';
import axios from 'axios';

export const useMenu = (apiUrl) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadMenu = async () => {
    // Agar ma'lumot allaqachon bo'lsa, qayta yuklamaymiz
    if (categories.length > 0) return;

    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        axios.get(`${apiUrl}/categories`),
        axios.get(`${apiUrl}/products`)
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
      if (catRes.data.length > 0) setActiveCategory(catRes.data[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return { categories, products, activeCategory, setActiveCategory, loading, loadMenu };
};