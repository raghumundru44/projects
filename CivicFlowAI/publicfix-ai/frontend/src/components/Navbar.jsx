import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, LogOut, LayoutDashboard, Plus, Settings, Briefcase } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{
      background: '#0a1628',
      borderBottom: '1px solid #1e293b',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '64px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
        <div style={{
          width: '32px', height: '32px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Shield size={18} color="white" />
        </div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>
          PublicFix <span style={{ color: '#60a5fa' }}>AI</span>
        </span>
      </Link>

      {/* Nav links */}
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user.role === 'citizen' && (
            <>
              <NavLink to="/dashboard" icon={<LayoutDashboard size={16} />}>Dashboard</NavLink>
              <NavLink to="/report" icon={<Plus size={16} />}>Report Issue</NavLink>
            </>
          )}
          {user.role === 'officer' && (
            <NavLink to="/officer" icon={<Briefcase size={16} />}>My Assignments</NavLink>
          )}
          {user.role === 'admin' && (
            <NavLink to="/admin" icon={<Settings size={16} />}>Admin Panel</NavLink>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#94a3b8',
                padding: '0.4rem 0.6rem',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.8rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.target.style.color = '#f87171'; e.target.style.borderColor = '#dc2626'; }}
              onMouseLeave={e => { e.target.style.color = '#94a3b8'; e.target.style.borderColor = '#334155'; }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/login" style={{
            color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
            padding: '0.4rem 0.875rem', borderRadius: '6px', transition: 'color 0.2s'
          }}>Login</Link>
          <Link to="/register" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}

function NavLink({ to, icon, children }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: '0.35rem',
      color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
      padding: '0.4rem 0.75rem', borderRadius: '6px',
      transition: 'all 0.2s'
    }}
    onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = '#1e293b'; }}
    onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}
      {children}
    </Link>
  );
}
