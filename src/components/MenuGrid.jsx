import React from 'react';
import { Search } from 'lucide-react';

const MenuGrid = () => {
  return (
    <div className="flex-1 bg-gray-50 h-screen flex flex-col p-6 overflow-hidden">
      {/* Search Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Menyu</h1>
          <p className="text-gray-500">Bugun: 2 Dekabr, 2025</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Qidirish..." 
            className="pl-10 pr-4 py-2 rounded-lg border-none shadow-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-20">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center border border-transparent hover:border-blue-500"
          >
            <div className={`w-24 h-24 ${product.color} rounded-full flex items-center justify-center text-4xl mb-3`}>
              {product.image}
            </div>
            <h3 className="font-bold text-gray-800 mb-1">{product.name}</h3>
            <p className="text-blue-600 font-bold">
              {product.price.toLocaleString()} so'm
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuGrid;