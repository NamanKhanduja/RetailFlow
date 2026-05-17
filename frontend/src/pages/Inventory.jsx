import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { Plus, Search, Pencil, Trash2, X, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = { name:'', sku:'', category:'', unit:'pcs', costPrice:'', sellingPrice:'', quantity:'', lowStockThreshold:10, description:'' };

const statusCls = { 'Sufficient':'badge-emerald', 'Short Stock':'badge-amber', 'Out of Stock':'badge-rose' };

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/products', { params: search ? { search } : {} });
      setProducts(data.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = (p)  => { setEditing(p._id); setForm({ ...p }); setModal(true); };
  const closeModal = ()   => setModal(false);

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) {
        await api.put(`/products/${editing}`, form);
        toast.success('Product updated!');
      } else {
        await api.post('/products', form);
        toast.success('Product added!');
      }
      closeModal(); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving product.');
    } finally { setSaving(false); }
  };

  const onDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted.');
      load();
    } catch (_) { toast.error('Could not delete product.'); }
  };

  return (
    <Layout title="Inventory" subtitle="Manage products and stock levels"
      actions={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14}/> Add Product</button>}>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div className="search-wrap">
          <Search size={14} />
          <input className="search-input" placeholder="Search products…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{fontSize:13, color:'var(--text-muted)'}}>{products.length} products</span>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : products.length === 0 ? (
            <div className="empty-state"><Package size={40} /><p>No products found. Add your first product!</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Category</th><th>Cost</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td><div style={{fontWeight:600}}>{p.name}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>{p.unit}</div></td>
                    <td style={{color:'var(--text-secondary)',fontFamily:'monospace',fontSize:12}}>{p.sku || '—'}</td>
                    <td>{p.category}</td>
                    <td>₹{p.costPrice?.toLocaleString()}</td>
                    <td style={{fontWeight:600}}>₹{p.sellingPrice?.toLocaleString()}</td>
                    <td style={{fontWeight:600, color: p.quantity===0?'var(--rose)':p.quantity<=p.lowStockThreshold?'var(--amber)':'var(--emerald)'}}>
                      {p.quantity}
                    </td>
                    <td><span className={`badge ${statusCls[p.stockStatus]||'badge-muted'}`}>{p.stockStatus}</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}><Pencil size={13}/></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(p._id, p.name)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}><X size={16}/></button>
            </div>
            <form onSubmit={onSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Product Name *</label>
                    <input name="name" className="form-input" value={form.name} onChange={onChange} required /></div>
                  <div className="form-group"><label>SKU</label>
                    <input name="sku" className="form-input" value={form.sku} onChange={onChange} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Category</label>
                    <input name="category" className="form-input" value={form.category} onChange={onChange} /></div>
                  <div className="form-group"><label>Unit</label>
                    <input name="unit" className="form-input" value={form.unit} onChange={onChange} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Cost Price (₹) *</label>
                    <input name="costPrice" type="number" min="0" className="form-input" value={form.costPrice} onChange={onChange} required /></div>
                  <div className="form-group"><label>Selling Price (₹) *</label>
                    <input name="sellingPrice" type="number" min="0" className="form-input" value={form.sellingPrice} onChange={onChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Quantity *</label>
                    <input name="quantity" type="number" min="0" className="form-input" value={form.quantity} onChange={onChange} required /></div>
                  <div className="form-group"><label>Low Stock Threshold</label>
                    <input name="lowStockThreshold" type="number" min="0" className="form-input" value={form.lowStockThreshold} onChange={onChange} /></div>
                </div>
                <div className="form-group"><label>Description</label>
                  <input name="description" className="form-input" value={form.description} onChange={onChange} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{width:'auto'}} disabled={saving}>
                  {saving ? <span className="spinner"/> : (editing ? 'Update' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
