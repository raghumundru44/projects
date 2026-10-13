import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, DelayBadge } from '../components/Badges';
import { getUploadUrl } from '../utils/config';
import { Plus, FileText, MapPin, Calendar, RefreshCw } from 'lucide-react';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/complaints');
      setComplaints(res.data.complaints);
    } catch (err) {
      setError('Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const stats = {
    total: complaints.length,
    active: complaints.filter(c => !['RESOLVED'].includes(c.status)).length,
    resolved: complaints.filter(c => c.status === 'RESOLVED').length,
    overdue: complaints.filter(c => c.delay_status === 'OVERDUE').length,
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>My Complaints</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Welcome, {user.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchComplaints} className="btn-secondary">
            <RefreshCw size={15} /> Refresh
          </button>
          <Link to="/report" className="btn-primary">
            <Plus size={16} /> Report Issue
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#60a5fa' },
          { label: 'Active', value: stats.active, color: '#fb923c' },
          { label: 'Resolved', value: stats.resolved, color: '#4ade80' },
          { label: 'Overdue', value: stats.overdue, color: '#f87171' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Complaint list */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto', width: '2rem', height: '2rem' }}></div>
          <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Loading complaints...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#f87171' }}>{error}</div>
      ) : complaints.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <FileText size={48} color="#334155" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No complaints yet</h3>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Report your first public issue to get started.</p>
          <Link to="/report" className="btn-primary">
            <Plus size={16} /> Report an Issue
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {complaints.map(c => (
            <Link key={c.id} to={`/complaint/${c.complaint_id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
                transition: 'all 0.2s', cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.transform = 'translateX(4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.transform = 'none'; }}
              >
                {/* Photo */}
                <div style={{
                  width: '72px', minWidth: '72px', height: '72px',
                  borderRadius: '8px', overflow: 'hidden',
                  background: '#0f172a', border: '1px solid #334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {c.original_photo ? (
                    <img src={getUploadUrl(c.original_photo)} alt="issue" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#475569', fontSize: '1.5rem' }}>📷</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}
                    </h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} /> {c.location_text}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} /> {new Date(c.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569', background: '#0f172a', borderRadius: '4px', padding: '0.1rem 0.5rem' }}>
                      {c.complaint_id}
                    </span>
                    <DelayBadge delayStatus={c.delay_status} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
