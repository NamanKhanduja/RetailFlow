import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { Plus, X, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'#0d1226',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 14px'}}>
      <p style={{fontSize:12,color:'#94a3b8',marginBottom:4}}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{fontSize:13,color:p.color}}>
          {p.name}: ₹{p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function Finance() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [summary, setSummary]   = useState({ totalRevenue:0, totalProfit:0, totalCOGS:0 });
  const [chartData, setChart]   = useState([]);
  const [sales, setSales]       = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ revenue:'', costOfGoodsSold:'', date:'', notes:'' });
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [monthly, allSales] = await Promise.all([
        api.get('/sales/monthly', { params: { month, year } }),
        api.get('/sales', { params: { from:`${year}-${String(month).padStart(2,'0')}-01`, to:`${year}-${String(month).padStart(2,'0')}-31` }}),
      ]);
      setSummary(monthly.data.totals);
      setChart(monthly.data.dailyBreakdown.map(d => ({
        date: d._id.slice(8),
        Revenue: d.revenue, Profit: d.profit,
      })));
      setSales(allSales.data.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [month, year]);

  const onSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/sales', { ...form, revenue: Number(form.revenue), costOfGoodsSold: Number(form.costOfGoodsSold) });
      toast.success('Sale logged!');
      setModal(false);
      setForm({ revenue:'', costOfGoodsSold:'', date:'', notes:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error logging sale.'); }
    finally { setSaving(false); }
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <Layout title="Finance & Analytics" subtitle="Track daily sales and monthly performance"
      actions={<button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={14}/> Log Sale</button>}>

      {/* Month/Year picker */}
      <div style={{display:'flex',gap:10,marginBottom:24}}>
        <select className="form-input" style={{width:120}} value={month} onChange={e=>setMonth(Number(e.target.value))}>
          {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select className="form-input" style={{width:100}} value={year} onChange={e=>setYear(Number(e.target.value))}>
          {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{marginBottom:24}}>
        {[
          { label:'Total Revenue',  value:`₹${summary.totalRevenue?.toLocaleString()}`,  color:'indigo' },
          { label:'Total Profit',   value:`₹${summary.totalProfit?.toLocaleString()}`,   color:'emerald' },
          { label:'Cost of Goods',  value:`₹${summary.totalCOGS?.toLocaleString()}`,     color:'amber' },
          { label:'Profit Margin',  value: summary.totalRevenue > 0
              ? `${((summary.totalProfit/summary.totalRevenue)*100).toFixed(1)}%`
              : '—', color:'cyan' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}><TrendingUp size={18}/></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="card" style={{marginBottom:24}}>
        <div className="card-header"><span className="card-title">Daily Revenue vs Profit</span></div>
        <div className="card-body">
          {chartData.length === 0
            ? <div className="empty-state"><p>No data for this month.</p></div>
            : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{top:5,right:10,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                    <XAxis dataKey="date" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}`}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Legend wrapperStyle={{fontSize:12,color:'#94a3b8'}}/>
                    <Bar dataKey="Revenue" fill="#6366f1" radius={[4,4,0,0]}/>
                    <Bar dataKey="Profit"  fill="#10b981" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
        </div>
      </div>

      {/* Sales Log Table */}
      <div className="card">
        <div className="card-header"><span className="card-title">Sales Log</span></div>
        <div className="table-wrap">
          {loading ? <div className="empty-state"><div className="spinner"/></div>
          : sales.length === 0 ? <div className="empty-state"><p>No sales recorded this month.</p></div>
          : (
            <table>
              <thead><tr><th>Date</th><th>Revenue</th><th>COGS</th><th>Profit</th><th>Order</th><th>Notes</th></tr></thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s._id}>
                    <td style={{color:'var(--text-secondary)'}}>{new Date(s.date).toLocaleDateString('en-IN')}</td>
                    <td style={{color:'var(--indigo)',fontWeight:600}}>₹{s.revenue?.toLocaleString()}</td>
                    <td style={{color:'var(--amber)'}}>₹{s.costOfGoodsSold?.toLocaleString()}</td>
                    <td style={{color:'var(--emerald)',fontWeight:700}}>₹{s.profit?.toLocaleString()}</td>
                    <td style={{fontSize:11,color:'var(--text-muted)'}}>{s.order?.orderNumber || 'Manual'}</td>
                    <td style={{color:'var(--text-secondary)',fontSize:12}}>{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Log Manual Sale</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={onSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Revenue (₹) *</label>
                    <input type="number" min="0" className="form-input" value={form.revenue}
                      onChange={e=>setForm(f=>({...f,revenue:e.target.value}))} required/></div>
                  <div className="form-group"><label>Cost of Goods (₹)</label>
                    <input type="number" min="0" className="form-input" value={form.costOfGoodsSold}
                      onChange={e=>setForm(f=>({...f,costOfGoodsSold:e.target.value}))}/></div>
                </div>
                <div className="form-group"><label>Date *</label>
                  <input type="date" className="form-input" value={form.date}
                    onChange={e=>setForm(f=>({...f,date:e.target.value}))} required/></div>
                <div className="form-group"><label>Notes</label>
                  <input className="form-input" value={form.notes}
                    onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{width:'auto'}} disabled={saving}>
                  {saving ? <span className="spinner"/> : 'Log Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
