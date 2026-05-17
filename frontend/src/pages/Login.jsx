import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, Mail, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Store size={22} color="#fff" /></div>
          <h1>Shop<span>Pro</span></h1>
        </div>
        <h2>Welcome back</h2>
        <p>Sign in to manage your shop</p>

        {error && (
          <div className="alert alert-rose">
            <AlertCircle size={15} style={{flexShrink:0, marginTop:1}} />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" className="form-input"
              placeholder="owner@shop.com" value={form.email} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" className="form-input"
              placeholder="••••••••" value={form.password} onChange={onChange} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{marginTop:8}}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p style={{textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-secondary)'}}>
          New shop?{' '}
          <Link to="/register" className="auth-link">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
