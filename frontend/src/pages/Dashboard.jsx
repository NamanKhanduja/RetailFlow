import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, Package, ShoppingCart, Users,
  AlertTriangle, CheckCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{background:'#0d1226',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 14px'}}>
        <p style={{fontSize:12,color:'#94a3b8',marginBottom:4}}>{label}</p>
        <p style={{fontSize:13,color:'#6366f1'}}>Revenue: ₹{payload[0]?.value?.toLocaleString()}</p>
        <p style={{fontSize:13,color:'#10b981'}}>Profit: ₹{payload[1]?.value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats]       = useState({ revenue:0, profit:0, orders:0, products:0 });
  const [lowStock, setLowStock] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, productsRes, salesRes, lowStockRes] = await Promise.all([
          api.get('/orders'),
          api.get('/products'),
          api.get('/sales/monthly'),
          api.get('/products/low-stock'),
        ]);
        setStats({
          orders:   ordersRes.data.count,
          products: productsRes.data.count,
          revenue:  salesRes.data.totals.totalRevenue,
          profit:   salesRes.data.totals.totalProfit,
        });
        setLowStock(lowStockRes.data.data.slice(0, 5));
        setRecentOrders(ordersRes.data.data.slice(0, 5));
        setChartData(
          salesRes.data.dailyBreakdown.slice(-14).map(d => ({
            date: d._id.slice(5),
            revenue: d.revenue,
            profit: d.profit,
          }))
        );
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  const statusBadge = (s) => {
    const m = { Completed:'emerald', Pending:'amber', Processing:'indigo', Cancelled:'rose' };
    return <span className={`badge badge-${m[s]||'muted'}`}>{s}</span>;
  };

  if (loading) return (
    <div className="loader-fullscreen">
      <div className="spinner" style={{width:36,height:36}} />
      <p style={{color:'var(--text-muted)'}}>Loading dashboard…</p>
    </div>
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout
      title={`${greeting}, ${user?.ownerName?.split(' ')[0]} 👋`}
      subtitle={`${user?.shopName} — ${now.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`}
    >
      {/* Stats */}
      <div className="stats-grid fade-up">
        {[
          { label:'Monthly Revenue', value:`₹${stats.revenue.toLocaleString()}`, icon: TrendingUp, color:'indigo', sub:'This month' },
          { label:'Monthly Profit',  value:`₹${stats.profit.toLocaleString()}`,  icon: CheckCircle, color:'emerald', sub:'Net earnings' },
          { label:'Total Orders',    value:stats.orders,  icon: ShoppingCart, color:'cyan', sub:'All time' },
          { label:'Products',        value:stats.products, icon: Package, color:'amber', sub:'In inventory' },
          { label:'Low Stock Alerts',value:lowStock.length, icon: AlertTriangle, color:'rose', sub:'Need restocking' },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}><s.icon size={18} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        {/* Revenue Chart */}
        <div className="card fade-up">
          <div className="card-header">
            <span className="card-title">Revenue & Profit — Last 14 Days</span>
          </div>
          <div className="card-body">
            {chartData.length === 0 ? (
              <div className="empty-state"><p>No sales data yet. Start logging sales!</p></div>
            ) : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{top:5,right:10,bottom:0,left:0}}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#gRev)" />
                    <Area type="monotone" dataKey="profit"  stroke="#10b981" strokeWidth={2} fill="url(#gPro)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="card fade-up">
          <div className="card-header">
            <span className="card-title">⚠️ Low Stock Alerts</span>
          </div>
          <div className="table-wrap">
            {lowStock.length === 0 ? (
              <div className="empty-state"><p>All products well stocked ✅</p></div>
            ) : (
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Status</th></tr></thead>
                <tbody>
                  {lowStock.map(p => (
                    <tr key={p._id}>
                      <td style={{fontWeight:500}}>{p.name}</td>
                      <td>{p.quantity} {p.unit}</td>
                      <td><span className={`badge badge-${p.quantity===0?'rose':'amber'}`}>{p.stockStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card fade-up" style={{marginTop:20}}>
        <div className="card-header">
          <span className="card-title">Recent Orders</span>
        </div>
        <div className="table-wrap">
          {recentOrders.length === 0 ? (
            <div className="empty-state"><p>No orders yet. Create your first order!</p></div>
          ) : (
            <table>
              <thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o._id}>
                    <td style={{fontWeight:600,color:'var(--indigo)'}}>{o.orderNumber}</td>
                    <td>{o.customer?.name}</td>
                    <td style={{fontWeight:600}}>₹{o.finalAmount?.toLocaleString()}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td style={{color:'var(--text-muted)'}}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
