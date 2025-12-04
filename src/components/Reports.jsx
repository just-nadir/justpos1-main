import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Calendar, TrendingUp, DollarSign, CreditCard, Download, Filter } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#06B6D4', '#EF4444']; // Naqd, Karta, Click, Nasiya

const Reports = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sales, setSales] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Bugun
    endDate: new Date().toISOString().split('T')[0]    // Bugun
  });
  
  const [stats, setStats] = useState({ 
    total: 0, 
    count: 0, 
    avg: 0, 
    byMethod: [], 
    byProduct: [],
    dailySales: [] 
  });

  useEffect(() => {
    loadData();
  }, [dateRange]); // Sana o'zgarganda qayta yuklaydi

  const loadData = async () => {
    if (!window.electron) return;
    try {
      const { ipcRenderer } = window.electron;
      // Backendga to'liq kunni qamrab olish uchun vaqt qo'shamiz
      const range = {
        startDate: `${dateRange.startDate}T00:00:00.000Z`,
        endDate: `${dateRange.endDate}T23:59:59.999Z`
      };
      
      const data = await ipcRenderer.invoke('get-sales', range);
      setSales(data);
      calculateStats(data);
    } catch (err) { console.error(err); }
  };

  const calculateStats = (data) => {
    let total = 0;
    let methodMap = { cash: 0, card: 0, click: 0, debt: 0 };
    let productMap = {};
    let dailyMap = {};

    data.forEach(sale => {
      total += sale.total_amount;
      
      // To'lov turlari
      const method = sale.payment_method || 'cash';
      if (methodMap[method] !== undefined) methodMap[method] += sale.total_amount;

      // Kunlik savdo (Grafik uchun)
      const dateKey = new Date(sale.date).toLocaleDateString();
      if (!dailyMap[dateKey]) dailyMap[dateKey] = 0;
      dailyMap[dateKey] += sale.total_amount;
      
      // Mahsulotlar
      try {
        const items = JSON.parse(sale.items_json || '[]');
        items.forEach(item => {
          if (!productMap[item.product_name]) productMap[item.product_name] = { qty: 0, revenue: 0 };
          productMap[item.product_name].qty += item.quantity;
          productMap[item.product_name].revenue += (item.price * item.quantity);
        });
      } catch (e) {}
    });

    // Formatlash (Grafiklar uchun)
    const byMethod = [
      { name: 'Naqd', value: methodMap.cash },
      { name: 'Karta', value: methodMap.card },
      { name: 'Click', value: methodMap.click },
      { name: 'Nasiya', value: methodMap.debt },
    ].filter(i => i.value > 0);

    const dailySales = Object.keys(dailyMap).map(date => ({
      date,
      amount: dailyMap[date]
    }));

    const byProduct = Object.entries(productMap)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.revenue - a.revenue);

    setStats({
      total,
      count: data.length,
      avg: data.length ? total / data.length : 0,
      byMethod,
      byProduct,
      dailySales
    });
  };

  return (
    <div className="flex w-full h-full bg-gray-100">
      {/* SIDEBAR */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full p-4 shadow-sm z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">Xisobotlar</h2>
        
        {/* Date Picker */}
        <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1">
             <Calendar size={14} /> Sana Oralig'i
          </p>
          <div className="space-y-2">
            <input 
              type="date" 
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full p-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700"
            />
            <input 
              type="date" 
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="w-full p-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700"
            />
          </div>
          <button onClick={loadData} className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
             <Filter size={16} /> Yangilash
          </button>
        </div>

        <div className="space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
             <BarChart3 size={20} /> Umumiy Ko'rsatkich
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'products' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
             <PieChartIcon size={20} /> Mahsulotlar
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-end mb-6">
           <div>
              <h1 className="text-2xl font-bold text-gray-800">
                 {activeTab === 'dashboard' ? "Sotuvlar Tahlili" : "Top Mahsulotlar"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                 {new Date(dateRange.startDate).toLocaleDateString()} — {new Date(dateRange.endDate).toLocaleDateString()}
              </p>
           </div>
           <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 flex items-center gap-2 shadow-sm">
              <Download size={18} /> Excelga Yuklash
           </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
             {/* CARDS */}
             <div className="grid grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                       <p className="text-gray-400 text-sm font-medium">Jami Savdo</p>
                       <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.total.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl"><DollarSign size={24}/></div>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                       <p className="text-gray-400 text-sm font-medium">Cheklar Soni</p>
                       <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.count}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CreditCard size={24}/></div>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                       <p className="text-gray-400 text-sm font-medium">O'rtacha Chek</p>
                       <h3 className="text-3xl font-bold text-gray-800 mt-1">{Math.round(stats.avg).toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><TrendingUp size={24}/></div>
                  </div>
               </div>
             </div>

             {/* CHARTS ROW */}
             <div className="grid grid-cols-2 gap-6 h-96">
                {/* BAR CHART */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                   <h3 className="font-bold text-gray-700 mb-4">Kunlik Dinamika</h3>
                   <div className="flex-1 w-full min-h-0">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={stats.dailySales}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                         <XAxis dataKey="date" tick={{fontSize: 12}} />
                         <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                         <Tooltip formatter={(val) => val.toLocaleString() + " so'm"} />
                         <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {/* PIE CHART */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                   <h3 className="font-bold text-gray-700 mb-4">To'lov Turlari</h3>
                   <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie
                           data={stats.byMethod}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={100}
                           paddingAngle={5}
                           dataKey="value"
                         >
                           {stats.byMethod.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip formatter={(val) => val.toLocaleString() + " so'm"} />
                         <Legend />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <table className="w-full text-left">
               <thead>
                 <tr className="text-gray-400 text-sm border-b border-gray-100">
                   <th className="pb-3 font-medium">Nomi</th>
                   <th className="pb-3 font-medium">Soni</th>
                   <th className="pb-3 font-medium text-right">Jami Summa</th>
                 </tr>
               </thead>
               <tbody>
                 {stats.byProduct.map((prod, i) => (
                   <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                     <td className="py-4 font-bold text-gray-700">{prod.name}</td>
                     <td className="py-4 text-gray-500">{prod.qty} ta</td>
                     <td className="py-4 text-right font-bold text-blue-600">{prod.revenue.toLocaleString()}</td>
                   </tr>
                 ))}
                 {stats.byProduct.length === 0 && <tr><td colSpan="3" className="py-8 text-center text-gray-400">Ma'lumot yo'q</td></tr>}
               </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;