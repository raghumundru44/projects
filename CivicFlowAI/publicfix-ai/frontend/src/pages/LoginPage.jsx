import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Shield, Mail, Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

        const handleSubmit = async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const user = await login(form.email, form.password);
            toast.success(`Welcome back, ${user.name}!`);
            if (user.role === 'officer') navigate('/officer');
            else if (user.role === 'admin') navigate('/admin');
            else navigate('/dashboard');
            // Reset form fields
            setForm({ email: '', password: '' });
          } catch (err) {
            toast.error(err.response?.data?.error || 'Login failed. Check your credentials.');
          } finally {
            setLoading(false);
          }
        };

  const fillDemo = (email) => setForm({ email, password: 'demo1234' });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Welcome Back</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sign in to PublicFix AI</p>
        </div>

        {/* Demo accounts */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Demo Login</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[['Citizen', 'citizen@demo.com'], ['Officer', 'officer@demo.com'], ['Admin', 'admin@demo.com']].map(([label, email]) => (
              <button key={email} onClick={() => fillDemo(email)} style={{
                background: '#0f172a', border: '1px solid #334155', borderRadius: '6px',
                color: '#94a3b8', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.target.style.borderColor = '#2563eb'; e.target.style.color = '#60a5fa'; }}
              onMouseLeave={e => { e.target.style.borderColor = '#334155'; e.target.style.color = '#94a3b8'; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              id="login-email"
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
              <Lock size={14} /> Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              id="login-password"
            />
          </div>
          <button type="submit" className="btn-primary" id="login-submit" disabled={loading} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
            {loading ? <><span className="spinner"></span> Signing in...</> : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', marginTop: '1.5rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
