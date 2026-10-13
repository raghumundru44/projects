import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Shield, User, Mail, Lock, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen', department: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const data = { ...form };
      if (data.role !== 'officer' && data.role !== 'admin') delete data.department;
      const user = await register(data);
      toast.success('Account created!');
      if (user.role === 'officer') navigate('/officer');
      else if (user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <UserPlus size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Create Account</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Join PublicFix AI</p>
        </div>

        <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
              <User size={14} /> Full Name
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              id="reg-name"
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
              <Mail size={14} /> Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              id="reg-email"
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
              <Lock size={14} /> Password
            </label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              id="reg-password"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>
              Account Type
            </label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} id="reg-role">
              <option value="citizen">Citizen</option>
              <option value="officer">Municipal Officer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          {(form.role === 'officer' || form.role === 'admin') && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>
                Department
              </label>
              <input
                type="text"
                placeholder="e.g. Road Maintenance"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                id="reg-department"
              />
            </div>
          )}
          <button type="submit" className="btn-primary" id="reg-submit" disabled={loading} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
            {loading ? <><span className="spinner"></span> Creating...</> : <><UserPlus size={16} /> Create Account</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', marginTop: '1.5rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
