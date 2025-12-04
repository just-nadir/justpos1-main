import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, Users, UtensilsCrossed, History, Calendar, 
  Download, Filter, TrendingUp, DollarSign, CreditCard, 
  ShoppingBag, Search, ChevronRight, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']; // Moviy, Yashil, Sariq, Qizil, Binafsha

const Reports = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, staff, products, history
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // --- DATA LOADING ---
  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    if (!window.electron) return;
    setLoading(true);
    try {
      const { ipcRenderer } = window.electron;
      // Kun oxirigacha bo'lgan vaqtni qamrab olish
      const range = {
        startDate: `${dateRange.startDate}T00:00:00.000Z`,
        endDate: `${dateRange.endDate}T23:59:59.999Z`
      };
      
      const data = await ipcRenderer.invoke('get-sales', range);
      setSalesData(data || []);
    } catch (err) { 
      console.error(err); 
    } finally {
      setLoading(false);
    }
  };

  // --- EXPORT TO CSV ---
  const exportToCSV = () => {
    if (salesData.length === 0) return;

    let headers = "ID,Sana,Vaqt,Stol,Ofitsiant,Mehmonlar,To'lov Turi,Summa\n";
    let csvContent = salesData.map(sale => {
      const date = new Date(sale.date);
      return [
        sale.check_number || sale.id,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        `"${sale.items_json ? JSON.parse(sale.items_json)[0]?.destination || 'Stol' : 'Stol'}"`, // Stol raqami json ichida bo'lmasa oddiy
        `"${sale.waiter_name || 'Kassir'}"`,
        sale.guest_count || 0,
        sale.payment_method,
        sale.total_amount
      ].join(",");
    }).join("\n");

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `hisobot_${dateRange.startDate}_${dateRange.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- ANALYTICS CALCULATIONS (useMemo for performance) ---
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalOrders = salesData.length;
    let methodMap = {};
    let waiterMap = {};
    let productMap = {};
    let hourlyMap = new Array(24).fill(0).map((_, i) => ({ hour: i, amount: 0, count: 0 }));

    salesData.forEach(sale => {
      const amount = sale.total_amount || 0;
      totalRevenue += amount;

      // Xizmat haqi (Service Charge) ni hisoblash
      // Formula: Service = Total - Subtotal + Discount
      const subtotal = sale.subtotal || amount; // Ehtiyot shart
      const discount = sale.discount || 0;
      const serviceCharge = amount - subtotal + discount;

      // Payment Method Stats
      const method = sale.payment_method || 'naqd';
      methodMap[method] = (methodMap[method] || 0) + amount;

      // Waiter Stats (Updated)
      const waiter = sale.waiter_name || "Noma'lum";
      if (!waiterMap[waiter]) {
          waiterMap[waiter] = { 
              name: waiter, 
              revenue: 0, 
              count: 0, 
              guests: 0, // Mehmonlar soni
              service: 0 // Xizmat haqi
          };
      }
      waiterMap[waiter].revenue += amount;
      waiterMap[waiter].count += 1;
      waiterMap[waiter].guests += (sale.guest_count || 0);
      waiterMap[waiter].service += serviceCharge;

      // Hourly Stats
      const hour = new Date(sale.date).getHours();
      if (hourlyMap[hour]) {
        hourlyMap[hour].amount += amount;
        hourlyMap[hour].count += 1;
      }

      // Product Stats
      try {
        const items = JSON.parse(sale.items_json || '[]');
        items.forEach(item => {
          const pName = item.product_name || item.name;
          if (!productMap[pName]) productMap[pName] = { name: pName, qty: 0, revenue: 0 };
          productMap[pName].qty += (item.quantity || item.qty);
          productMap[pName].revenue += (item.price * (item.quantity || item.qty));
        });
      } catch (e) {}
    });

    return {
      totalRevenue,
      totalOrders,
      avgCheck: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      paymentMethods: Object.entries(methodMap).map(([name, value]) => ({ name, value })),
      waiters: Object.values(waiterMap).sort((a, b) => b.revenue - a.revenue),
      products: Object.values(productMap).sort((a, b) => b.qty - a.qty),
      hourlySales: hourlyMap
    };
  }, [salesData]);

  // --- RENDERERS ---

  // 1. DASHBOARD TAB
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Jami Savdo</p>
            <h3 className="text-3xl font-black text-gray-800 mt-2">{stats.totalRevenue.toLocaleString()} <span className="text-sm text-gray-400 font-normal">so'm</span></h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Cheklar Soni</p>
            <h3 className="text-3xl font-black text-gray-800 mt-2">{stats.totalOrders} <span className="text-sm text-gray-400 font-normal">ta</span></h3>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><ShoppingBag size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">O'rtacha Chek</p>
            <h3 className="text-3xl font-black text-gray-800 mt-2">{stats.avgCheck.toLocaleString()} <span className="text-sm text-gray-400 font-normal">so'm</span></h3>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><TrendingUp size={24} /></div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        {/* Hourly Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
            <Calendar size={18} /> Soatbay Savdo Dinamikasi
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.hourlySales}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{fontSize: 12}} />
                <YAxis tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 12}} />
                <Tooltip formatter={(val) => val.toLocaleString() + " so'm"} labelFormatter={(label) => `${label}:00`} />
                <Area type="monotone" dataKey="amount" stroke="#3B82F6" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
            <CreditCard size={18} /> To'lov Turlari
          </h3>
          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => val.toLocaleString() + " so'm"} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
               <div className="text-center">
                 <span className="text-xs text-gray-400 font-bold block">JAMI</span>
                 <span className="text-sm font-bold text-gray-800">{stats.totalRevenue.toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. STAFF TAB (YANGILANDI)
  const renderStaff = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm">Ofitsiant Ismi</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm text-center">Cheklar</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm text-center">Mehmonlar</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm text-right">Xizmat Haqi</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm text-right">Jami Savdo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stats.waiters.map((w, i) => (
            <tr key={i} className="hover:bg-blue-50/50 transition-colors">
              <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {w.name.charAt(0)}
                </div>
                {w.name}
              </td>
              <td className="px-6 py-4 text-center text-gray-600">{w.count} ta</td>
              <td className="px-6 py-4 text-center font-bold text-blue-600">{w.guests} kishi</td>
              <td className="px-6 py-4 text-right font-medium text-orange-600">{Math.round(w.service).toLocaleString()}</td>
              <td className="px-6 py-4 text-right font-bold text-gray-800">{w.revenue.toLocaleString()}</td>
            </tr>
          ))}
          {stats.waiters.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">Ma'lumot yo'q</td></tr>}
        </tbody>
      </table>
    </div>
  );

  // 3. PRODUCTS TAB
  const renderProducts = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm">Taom Nomi</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm text-center">Sotildi (soni)</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm text-right">Jami Tushum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stats.products.map((p, i) => (
            <tr key={i} className="hover:bg-blue-50/50 transition-colors group">
              <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-2">
                <span className="text-gray-300 w-6 text-sm group-hover:text-blue-500 font-mono">#{i + 1}</span>
                {p.name}
              </td>
              <td className="px-6 py-4 text-center text-gray-600 font-medium">{p.qty}</td>
              <td className="px-6 py-4 text-right font-bold text-blue-600">{p.revenue.toLocaleString()}</td>
            </tr>
          ))}
          {stats.products.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-gray-400">Ma'lumot yo'q</td></tr>}
        </tbody>
      </table>
    </div>
  );

  // 4. HISTORY TAB
  const renderHistory = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm w-20">#Chek</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm">Vaqt</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm">Ofitsiant</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm">Mehmon</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm">Mijoz</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm">To'lov</th>
            <th className="px-6 py-4 font-bold text-gray-600 text-sm text-right">Summa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {salesData.map((sale) => (
            <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-mono text-gray-500 text-sm">#{sale.check_number || sale.id}</td>
              <td className="px-6 py-4 text-sm text-gray-600">
                <div className="font-bold text-gray-800">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                <div className="text-xs text-gray-400">{new Date(sale.date).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 font-medium text-gray-800">{sale.waiter_name || "Kassir"}</td>
              <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">{sale.guest_count || '-'}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{sale.customer_id ? "Mijoz (ID: "+sale.customer_id+")" : "-"}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                  ${sale.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                    sale.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                    sale.payment_method === 'debt' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                  {sale.payment_method || 'Naqd'}
                </span>
              </td>
              <td className="px-6 py-4 text-right font-black text-gray-800">{sale.total_amount?.toLocaleString()}</td>
            </tr>
          ))}
          {salesData.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">Hech qanday savdo tarixi yo'q</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex w-full h-full bg-gray-100 font-sans">
      {/* SIDEBAR FILTERS */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-20 shrink-0">
        <div className="p-6 pb-2">
          <h2 className="text-2xl font-black text-gray-800 mb-1">Xisobotlar</h2>
          <p className="text-xs text-gray-400 font-medium">Boshqaruv va Tahlil</p>
        </div>

        <div className="px-4 py-2">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
            <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
               <Calendar size={12} /> Sana Oralig'i
            </p>
            <div className="space-y-2">
              <input 
                type="date" 
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="w-full p-2.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input 
                type="date" 
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="w-full p-2.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button onClick={loadData} disabled={loading} className="w-full mt-3 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-gray-800 flex items-center justify-center gap-2 active:scale-95 transition-transform">
               {loading ? "Yuklanmoqda..." : <><Filter size={16} /> Yangilash</>}
            </button>
          </div>

          <div className="space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
               <LayoutDashboard size={20} /> Umumiy Ko'rsatkich
            </button>
            <button onClick={() => setActiveTab('staff')} className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'staff' ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
               <Users size={20} /> Xodimlar Statistikasi
            </button>
            <button onClick={() => setActiveTab('products')} className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'products' ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
               <UtensilsCrossed size={20} /> Menyu Tahlili
            </button>
            <button onClick={() => setActiveTab('history')} className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'history' ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
               <History size={20} /> Tranzaksiyalar
            </button>
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-gray-100">
           <button onClick={exportToCSV} className="w-full border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 flex items-center justify-center gap-2 transition-colors">
              <Download size={18} /> Excelga Yuklash
           </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="bg-white h-20 px-8 flex items-center justify-between border-b border-gray-200 shrink-0 z-10 shadow-sm">
           <div>
              <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                 {activeTab === 'dashboard' && "Biznes Holati"}
                 {activeTab === 'staff' && "Xodimlar Samaradorligi"}
                 {activeTab === 'products' && "Menyu Reytingi"}
                 {activeTab === 'history' && "Savdo Tarixi"}
              </h1>
              <p className="text-gray-400 text-xs font-bold mt-0.5 flex items-center gap-1">
                 <Calendar size={12}/> {new Date(dateRange.startDate).toLocaleDateString()} — {new Date(dateRange.endDate).toLocaleDateString()}
              </p>
           </div>
           
           {/* Quick Stats Summary (Optional Header Info) */}
           <div className="flex gap-6">
              <div className="text-right">
                 <p className="text-[10px] font-bold text-gray-400 uppercase">Jami Tushum</p>
                 <p className="text-lg font-black text-blue-600">{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="text-right border-l border-gray-100 pl-6">
                 <p className="text-[10px] font-bold text-gray-400 uppercase">Cheklar</p>
                 <p className="text-lg font-black text-gray-800">{stats.totalOrders}</p>
              </div>
           </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 pb-32">
           {activeTab === 'dashboard' && renderDashboard()}
           {activeTab === 'staff' && renderStaff()}
           {activeTab === 'products' && renderProducts()}
           {activeTab === 'history' && renderHistory()}
        </div>
      </div>
    </div>
  );
};

export default Reports;