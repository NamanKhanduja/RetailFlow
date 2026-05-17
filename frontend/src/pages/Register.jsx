import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shopName:'', ownerName:'', email:'', password:'', phone:'', address:''
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      toast.success('Shop created! Welcome 🎉');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{maxWidth:460}}>
        <div className="auth-logo">
          <div className="auth-logo-icon"><Store size={22} color="#fff" /></div>
          <h1>Retail<span>Flow</span></h1>
        </div>
        <h2>Set up your shop</h2>
        <p>Create your account to get started</p>

        {error && (
          <div className="alert alert-rose">
            <AlertCircle size={15} style={{flexShrink:0, marginTop:1}} />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Shop Name</label>
              <input name="shopName" className="form-input" placeholder="My Awesome Shop"
                value={form.shopName} onChange={onChange} required />
            </div>
            <div className="form-group">
              <label>Owner Name</label>
              <input name="ownerName" className="form-input" placeholder="Full name"
                value={form.ownerName} onChange={onChange} required />
            </div>
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" className="form-input" placeholder="owner@shop.com"
              value={form.email} onChange={onChange} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" className="form-input" placeholder="Min 6 chars"
                value={form.password} onChange={onChange} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input name="phone" className="form-input" placeholder="+91 98765 43210"
                value={form.phone} onChange={onChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Shop Address</label>
            <input name="address" className="form-input" placeholder="Street, City, State"
              value={form.address} onChange={onChange} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{marginTop:8}}>
            {loading ? <span className="spinner" /> : 'Create Shop Account'}
          </button>
        </form>
        <p style={{textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-secondary)'}}>
          Already registered? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
