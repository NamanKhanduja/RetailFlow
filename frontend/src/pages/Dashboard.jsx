import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, Package, ShoppingCart, Users,
  AlertTriangle, CheckCircle, Check, Box, Share, Copy, Download,
  Activity, BarChart2, Network, SlidersHorizontal, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{background:'#0f172a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 14px', boxShadow:'0 10px 25px rgba(0,0,0,0.5)'}}>
        <p style={{fontSize:12,color:'#94a3b8',marginBottom:4, fontWeight:600}}>{label}</p>
        <p style={{fontSize:13,color:'#60a5fa', fontWeight:600}}>Revenue: ₹{payload[0]?.value?.toLocaleString()}</p>
        <p style={{fontSize:13,color:'#34d399', fontWeight:600}}>Profit: ₹{payload[1]?.value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

// Custom Mini Graphics matching the screenshot
const MiniLineChart = () => (
  <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 20C2 20 10 12 18 16C26 20 34 8 42 12C50 16 58 4 58 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 20C2 20 10 12 18 16C26 20 34 8 42 12C50 16 58 4 58 4L58 24H2V20Z" fill="currentColor" fillOpacity="0.2"/>
  </svg>
);

const MiniBarChart = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="14" width="6" height="10" rx="1" fill="currentColor"/>
    <rect x="12" y="8" width="6" height="16" rx="1" fill="currentColor"/>
    <rect x="22" y="12" width="6" height="12" rx="1" fill="currentColor"/>
    <rect x="32" y="4" width="6" height="20" rx="1" fill="currentColor"/>
  </svg>
);

const MiniDonut = ({ value }) => (
  <div style={{position:'relative', width:28, height:28, borderRadius:'50%', border:'3px solid currentColor', display:'flex', alignItems:'center', justifyContent:'center'}}>
    <span style={{fontSize:10, fontWeight:700, color:'#fff'}}>{value > 99 ? '99+' : value}</span>
  </div>
);

const MiniHierarchy = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="2" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="4" y="14" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="16" y="14" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="28" y="14" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M20 8V11H8V14M20 11H32V14M20 11V14" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const MiniSliders = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="2" y1="6" x2="38" y2="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
    <line x1="2" y1="18" x2="38" y2="18" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
    <path d="M12 2L12 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M28 14L28 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="6" r="3" fill="currentColor"/>
    <circle cx="28" cy="18" r="3" fill="currentColor"/>
  </svg>
);

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

  const TopActions = (
    <div className="topbar-icon-actions">
      <button className="top-icon-btn"><Share size={18} /></button>
      <button className="top-icon-btn"><Copy size={18} /></button>
      <button className="top-icon-btn"><Download size={18} /></button>
    </div>
  );

  return (
    <Layout
      title={<span>{greeting}, <span style={{color:'#60a5fa'}}>{user?.ownerName?.split(' ')[0]} 👋</span></span>}
      subtitle={`${user?.shopName} — ${now.toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'short',day:'numeric'})}`}
      actions={TopActions}
    >
      {/* Stats row exactly matching screenshot */}
      <div className="stats-grid-v2 fade-up">
        {/* Revenue */}
        <div className="stat-card stat-blue">
          <div className="stat-top">
            <div className="stat-icon-small bg-blue"><TrendingUp size={18} /></div>
            <div className="stat-icon-large text-blue"><ArrowUpRight size={56} strokeWidth={1} /></div>
          </div>
          <div className="stat-mid">
            <div className="stat-title">MONTHLY REVENUE</div>
            <div className="stat-value">₹{stats.revenue.toLocaleString()}</div>
          </div>
          <div className="stat-bot">
            <div className="stat-sub">This month</div>
            <div className="stat-mini-graphic text-blue"><MiniLineChart /></div>
          </div>
        </div>

        {/* Profit */}
        <div className="stat-card stat-green">
          <div className="stat-top">
            <div className="stat-icon-small bg-green"><CheckCircle size={18} /></div>
            <div className="stat-icon-large text-green"><Check size={56} strokeWidth={1} /></div>
          </div>
          <div className="stat-mid">
            <div className="stat-title">MONTHLY PROFIT</div>
            <div className="stat-value">₹{stats.profit.toLocaleString()}</div>
          </div>
          <div className="stat-bot">
            <div className="stat-sub">Net earnings</div>
            <div className="stat-mini-graphic text-green"><MiniBarChart /></div>
          </div>
        </div>

        {/* Orders */}
        <div className="stat-card stat-purple">
          <div className="stat-top">
            <div className="stat-icon-small bg-purple"><ShoppingCart size={18} /></div>
            <div className="stat-icon-large text-purple"><ShoppingCart size={56} strokeWidth={1} /></div>
          </div>
          <div className="stat-mid">
            <div className="stat-title">TOTAL ORDERS</div>
            <div className="stat-value">{stats.orders}</div>
          </div>
          <div className="stat-bot">
            <div className="stat-sub">All time</div>
            <div className="stat-mini-graphic text-purple"><MiniDonut value={0} /></div>
          </div>
        </div>

        {/* Products */}
        <div className="stat-card stat-gold">
          <div className="stat-top">
            <div className="stat-icon-small bg-gold"><Package size={18} /></div>
            <div className="stat-icon-large text-gold"><Box size={56} strokeWidth={1} /></div>
          </div>
          <div className="stat-mid">
            <div className="stat-title">PRODUCTS</div>
            <div className="stat-value">{stats.products}</div>
          </div>
          <div className="stat-bot">
            <div className="stat-sub">In inventory</div>
            <div className="stat-mini-graphic text-gold"><MiniHierarchy /></div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="stat-card stat-red">
          <div className="stat-top">
            <div className="stat-icon-small bg-red"><AlertTriangle size={18} /></div>
            <div className="stat-icon-large text-red"><AlertTriangle size={56} strokeWidth={1} /></div>
          </div>
          <div className="stat-mid">
            <div className="stat-title">LOW STOCK ALERTS</div>
            <div className="stat-value">{lowStock.length}</div>
          </div>
          <div className="stat-bot">
            <div className="stat-sub">Need restocking</div>
            <div className="stat-mini-graphic text-red"><MiniSliders /></div>
          </div>
        </div>
      </div>

      <div className="dash-grid-v2 fade-up" style={{animationDelay:'100ms'}}>
        {/* Revenue Chart */}
        <div className="card city-bg">
          <div className="card-header border-none">
            <span className="card-title">Revenue & Profit — Last 14 Days</span>
          </div>
          <div className="card-body" style={{paddingTop:0}}>
            {chartData.length === 0 ? (
              <div className="city-empty-state">
                <h3>Waiting for your first sale...</h3>
                <p>Let's make it count!</p>
              </div>
            ) : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{top:5,right:10,bottom:0,left:0}}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={3} fill="url(#gRev)" />
                    <Area type="monotone" dataKey="profit"  stroke="#34d399" strokeWidth={3} fill="url(#gPro)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Panel */}
        <div className="card">
          <div className="card-header border-none">
            <span className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>
              <AlertTriangle size={18} color="#fbbf24" /> Low Stock Alerts
            </span>
          </div>
          <div className="card-body" style={{paddingTop:0}}>
            {lowStock.length === 0 ? (
              <div className="empty-stock-grid">
                {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="empty-slot" />)}
                <div className="all-good">All products well stocked <Check size={16} color="#34d399" /></div>
              </div>
            ) : (
              <div className="table-wrap" style={{margin:0, padding:0}}>
                <table style={{marginTop:0}}>
                  <thead><tr><th>Product</th><th>Qty</th></tr></thead>
                  <tbody>
                    {lowStock.map(p => (
                      <tr key={p._id}>
                        <td style={{fontWeight:600}}>{p.name}</td>
                        <td style={{textAlign:'right'}}>
                          <span className={`badge badge-${p.quantity===0?'rose':'amber'}`}>
                            {p.quantity} {p.unit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
