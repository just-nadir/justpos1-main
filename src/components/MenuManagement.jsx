import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Power, X, ChefHat } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const ProductModal = ({ isOpen, onClose, onSubmit, newProduct, setNewProduct, categories, kitchens }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-white w-[500px] rounded-2xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
        <h2 className="text-xl font-bold text-gray-800 mb-6">Yangi Taom</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
            <input required type="text" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" placeholder="Masalan: Qozon Kabob" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Narxi</label>
            <input required type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
            <select value={newProduct.category_id || ''} onChange={e => setNewProduct({...newProduct, category_id: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500">
              <option value="">Tanlang</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          
          {/* OSHXONA TANLASH */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qayerda tayyorlanadi?</label>
            <div className="grid grid-cols-3 gap-2">
              {/* Oshxonalar bo'sh bo'lsa xato bermasligi uchun tekshiruv */}
              {kitchens && kitchens.length > 0 ? kitchens.map((k) => (
                <button key={k.id} type="button" onClick={() => setNewProduct({...newProduct, destination: String(k.id)})}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all 
                    ${newProduct.destination === String(k.id) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <ChefHat size={20} />
                  <span className="text-xs font-bold capitalize truncate w-full text-center">{k.name}</span>
                </button>
              )) : <p className="text-xs text-gray-400 col-span-3 text-center">Oshxonalar mavjud emas. Sozlamalardan qo'shing.</p>}
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 mt-4">Saqlash</button>
        </form>
      </div>
    </div>
  );
};

const MenuManagement = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category_id: '', destination: '1' });

  // Delete Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const loadData = async () => {
    if (!window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      const cats = await ipcRenderer.invoke('get-categories');
      const prods = await ipcRenderer.invoke('get-products');
      const kits = await ipcRenderer.invoke('get-kitchens');
      
      setCategories(cats || []);
      setProducts(prods || []);
      setKitchens(kits || []);
      
      if (!activeCategory && cats && cats.length > 0) setActiveCategory(cats[0].id);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const { ipcRenderer } = window.electron;
      await ipcRenderer.invoke('add-category', newCategoryName);
      setNewCategoryName('');
      setIsAddingCategory(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const { ipcRenderer } = window.electron;
      await ipcRenderer.invoke('add-product', { ...newProduct, price: Number(newProduct.price), category_id: Number(newProduct.category_id) || activeCategory });
      setIsModalOpen(false);
      // Reset qilish
      setNewProduct({ name: '', price: '', category_id: '', destination: '1' });
      loadData();
    } catch (err) { console.error(err); }
  };
  
  const toggleStatus = async (id, status) => {
    const { ipcRenderer } = window.electron;
    await ipcRenderer.invoke('toggle-product-status', { id, status: status ? 0 : 1 });
    loadData();
  };

  const confirmDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const performDelete = async () => {
    try {
      const { ipcRenderer } = window.electron;
      await ipcRenderer.invoke('delete-product', confirmModal.id);
      loadData();
    } catch(err) { console.error(err); }
  };

  const filteredProducts = products.filter(p => p.category_id === activeCategory);

  return (
    <div className="flex w-full h-full relative">
      {/* SIDEBAR (Kategoriyalar) */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Kategoriyalar</h2>
          <button onClick={() => setIsAddingCategory(true)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Plus size={20} /></button>
        </div>
        
        {isAddingCategory && (
          <form onSubmit={handleAddCategory} className="p-4 bg-gray-50 border-b border-gray-100 animate-in slide-in-from-top">
            <input autoFocus type="text" placeholder="Nomi..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 mb-2 text-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsAddingCategory(false)} className="text-xs text-gray-500 py-1 flex-1">Bekor</button>
              <button type="submit" className="text-xs bg-blue-600 text-white py-1 rounded-md flex-1">Qo'shish</button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors flex justify-between items-center ${activeCategory === cat.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT (Mahsulotlar) */}
      <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
        <div className="bg-white px-8 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">Menyu</h1>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={20} /> Yangi Taom
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className={`bg-white p-4 rounded-2xl shadow-sm border-2 transition-all relative group ${product.is_active ? 'border-transparent hover:border-blue-400' : 'border-gray-200 opacity-60'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 uppercase truncate max-w-[100px]">
                    {product.kitchen_name || 'Aniqlanmagan'} 
                  </span>
                  <button onClick={() => toggleStatus(product.id, product.is_active)} className={`p-1.5 rounded-full ${product.is_active ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-200'}`}><Power size={16} /></button>
                </div>
                <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{product.name}</h3>
                <p className="text-blue-600 font-bold">{product.price.toLocaleString()} so'm</p>
                <button onClick={() => confirmDelete(product.id)} className="absolute bottom-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddProduct} newProduct={newProduct} setNewProduct={setNewProduct} categories={categories} kitchens={kitchens} />
      
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={performDelete}
        message="Taomni o'chirmoqchimisiz?"
      />
    </div>
  );
};

export default MenuManagement;