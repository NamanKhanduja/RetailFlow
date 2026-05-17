import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { Plus, X, ShoppingCart, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = { Pending:'amber', Processing:'indigo', Completed:'emerald', Cancelled:'rose' };
const STATUSES = ['Pending','Processing','Completed','Cancelled'];

export default function Orders() {
  const [orders, setOrders]     = useState([]);
  const [products, setProducts] = useState([]);
  const [filter, setFilter]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ customerName:'', customerPhone:'', discount:0, notes:'' });
  const [items, setItems]       = useState([{ product:'', quantity:1 }]);

  const load = async () => {
    try {
      const params = filter ? { status: filter } : {};
      const [ordRes, prodRes] = await Promise.all([api.get('/orders',{params}), api.get('/products')]);
      setOrders(ordRes.data.data);
      setProducts(prodRes.data.data.filter(p => p.quantity > 0));
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const addItem    = () => setItems(i => [...i, { product:'', quantity:1 }]);
  const removeItem = (idx) => setItems(i => i.filter((_,j) => j!==idx));
  const updateItem = (idx, field, val) => setItems(i => i.map((it,j) => j===idx ? {...it,[field]:val} : it));

  const onSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/orders', {
        customer: { name: form.customerName, phone: form.customerPhone },
        items: items.map(i => ({ product: i.product, quantity: Number(i.quantity) })),
        discount: Number(form.discount),
        notes: form.notes,
      });
      toast.success('Order created!');
      setModal(false);
      setForm({ customerName:'', customerPhone:'', discount:0, notes:'' });
      setItems([{ product:'', quantity:1 }]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order.');
    } finally { setSaving(false); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success(`Order marked ${status}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed.'); }
  };

  return (
    <Layout title="Orders" subtitle="Create and manage customer orders"
      actions={<button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={14}/> New Order</button>}>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {['', ...STATUSES].map(s => (
          <button key={s} className={`btn btn-sm ${filter===s ? 'btn-primary' : 'btn-ghost'}`}
            style={{width:'auto'}} onClick={()=>setFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="empty-state"><div className="spinner"/></div>
          : orders.length === 0 ? <div className="empty-state"><ShoppingCart size={40}/><p>No orders found.</p></div>
          : (
            <table>
              <thead>
                <tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Discount</th><th>Final</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id}>
                    <td style={{fontWeight:700,color:'var(--indigo)'}}>{o.orderNumber}</td>
                    <td>
                      <div style={{fontWeight:500}}>{o.customer?.name}</div>
                      {o.customer?.phone && <div style={{fontSize:11,color:'var(--text-muted)'}}>{o.customer.phone}</div>}
                    </td>
                    <td style={{color:'var(--text-secondary)'}}>{o.items?.length} item(s)</td>
                    <td>₹{o.totalAmount?.toLocaleString()}</td>
                    <td style={{color:'var(--rose)'}}>-₹{o.discount}</td>
                    <td style={{fontWeight:700}}>₹{o.finalAmount?.toLocaleString()}</td>
                    <td>
                      <select
                        value={o.status}
                        onChange={e => changeStatus(o._id, e.target.value)}
                        style={{background:'transparent',border:'none',color:`var(--${STATUS_COLORS[o.status]})`,fontWeight:600,fontSize:12,cursor:'pointer',outline:'none'}}
                      >
                        {STATUSES.map(s => <option key={s} value={s} style={{background:'#0d1226',color:'#f1f5f9'}}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{color:'var(--text-muted)',fontSize:12}}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header">
              <h3>New Order</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Customer Name</label>
                    <input className="form-input" placeholder="Walk-in Customer"
                      value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))}/></div>
                  <div className="form-group"><label>Phone</label>
                    <input className="form-input" value={form.customerPhone}
                      onChange={e=>setForm(f=>({...f,customerPhone:e.target.value}))}/></div>
                </div>

                <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:10}}>Items</label>
                {items.map((item, idx) => (
                  <div key={idx} style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                    <select className="form-input" style={{flex:2}} value={item.product}
                      onChange={e=>updateItem(idx,'product',e.target.value)} required>
                      <option value="">Select product…</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name} (Stock: {p.quantity})</option>)}
                    </select>
                    <input type="number" min="1" className="form-input" style={{width:80}} value={item.quantity}
                      onChange={e=>updateItem(idx,'quantity',e.target.value)} required />
                    {items.length > 1 && (
                      <button type="button" className="btn btn-danger btn-icon btn-sm" onClick={()=>removeItem(idx)}><X size={13}/></button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{marginBottom:16}}>
                  <Plus size={13}/> Add Item
                </button>

                <div className="form-row">
                  <div className="form-group"><label>Discount (₹)</label>
                    <input type="number" min="0" className="form-input" value={form.discount}
                      onChange={e=>setForm(f=>({...f,discount:e.target.value}))}/></div>
                  <div className="form-group"><label>Notes</label>
                    <input className="form-input" value={form.notes}
                      onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{width:'auto'}} disabled={saving}>
                  {saving ? <span className="spinner"/> : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
