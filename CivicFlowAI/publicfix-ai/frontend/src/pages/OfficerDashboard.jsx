import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, DelayBadge } from '../components/Badges';
import { getUploadUrl } from '../utils/config';
import { Camera, RefreshCw, Upload, AlertCircle, Clock, MapPin, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const VALID_TRANSITIONS = ['ASSIGNED', 'IN_PROGRESS'];

function ComplaintCard({ c, onStatusUpdate, onUploadCompletion }) {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const fileRef = useRef();

  const handleStatus = async () => {
    if (!status) return toast.error('Select a status first.');
    setStatusLoading(true);
    try {
      await axios.patch(`/api/officer/complaints/${c.complaint_id}/status`, { status, note });
      toast.success('Status updated.');
      setStatus(''); setNote('');
      onStatusUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return toast.error('Please select a photo.');
    setUploadLoading(true);
    const fd = new FormData();
    fd.append('completion_photo', uploadFile);
    try {
      const res = await axios.post(`/api/officer/complaints/${c.complaint_id}/completion-photo`, fd);
      toast.success(`Completion photo uploaded! AI Verdict: ${res.data.ai_verdict}`);
      setUploadFile(null);
      onStatusUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploadLoading(false);
    }
  };

  const allowStatusChange = ['ASSIGNED', 'IN_PROGRESS'].includes(c.status);
  const allowCompletion = ['ASSIGNED', 'IN_PROGRESS'].includes(c.status);

  return (
    <div className="card" style={{ border: c.delay_status === 'OVERDUE' ? '1px solid #dc2626' : '1px solid #334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontWeight: 700, margin: 0, fontSize: '1.05rem' }}>{c.title}</h3>
            <span style={{ fontSize: '0.72rem', background: '#1e3a5f', color: '#60a5fa', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              {c.category}
            </span>
          </div>
          <code style={{ fontSize: '0.75rem', color: '#60a5fa' }}>{c.complaint_id}</code>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <DelayBadge delayStatus={c.delay_status} />
          <StatusBadge status={c.status} />
        </div>
      </div>

      {/* Description */}
      {c.description && (
        <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '0.75rem' }}>
          {c.description}
        </p>
      )}

      {/* Location, Coordinates, Assigned Office, Distance, Submission time */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap', background: '#0f172a', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <MapPin size={13} color="#38bdf8" /> <strong>Address:</strong> {c.location_text || 'Address not specified'}
        </span>
        {c.latitude != null && c.longitude != null && (
          <span style={{ fontSize: '0.8rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            🌐 <strong>GPS:</strong> {c.latitude}, {c.longitude}
          </span>
        )}
        {c.assigned_office && (
          <span style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            🏢 <strong>Assigned Office:</strong> {c.assigned_office} {c.assigned_office_id ? `(#${c.assigned_office_id})` : ''}
          </span>
        )}
        {c.distance != null && (
          <span style={{ fontSize: '0.8rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            📏 <strong>Distance:</strong> ≈ {c.distance.toFixed(2)} km
          </span>
        )}
        {c.submitted_at && (
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={13} /> <strong>Submitted:</strong> {new Date(c.submitted_at).toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#94a3b8' }}>
        <span>👤 <strong>Citizen:</strong> {c.citizen_name || 'Citizen'} ({c.citizen_email || 'N/A'})</span>
        {c.due_date && (
          <span><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Due: {new Date(c.due_date).toLocaleDateString()}</span>
        )}
      </div>

      {/* Photo preview */}
      {c.original_photo ? (
        <img
          src={getUploadUrl(c.original_photo)}
          alt="Problem photograph"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155', marginBottom: '1rem' }}
        />
      ) : (
        <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: '6px', border: '1px dashed #334155', color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
          📷 No photograph attached
        </div>
      )}

      {/* Latest note if exists */}
      {c.latest_note && (
        <div style={{ background: '#1e293b', borderLeft: '3px solid #38bdf8', padding: '0.5rem 0.75rem', borderRadius: '0 6px 6px 0', marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
            <strong style={{ color: '#38bdf8' }}>Latest Note:</strong> {c.latest_note}
          </p>
        </div>
      )}

      {/* Status update & Officer Response */}
      {allowStatusChange && (
        <div style={{ borderTop: '1px solid #334155', paddingTop: '0.875rem', marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Update Status & Submit Officer Response
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
              <option value="">Select new status...</option>
              {VALID_TRANSITIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button onClick={handleStatus} className="btn-primary" disabled={statusLoading} style={{ whiteSpace: 'nowrap' }}>
              {statusLoading ? <span className="spinner"></span> : <CheckCircle size={15} />} Save Status & Response
            </button>
          </div>
          <input
            type="text"
            placeholder="Officer response note (e.g. Work crew dispatched to road; repairs in progress)..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      )}

      {/* Completion photo */}
      {allowCompletion && (
        <div style={{ borderTop: '1px solid #334155', paddingTop: '0.875rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Upload Completion Photo (triggers AI verification)
          </p>
          <input ref={fileRef} type="file" accept="image/*" onChange={e => setUploadFile(e.target.files[0])} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => fileRef.current.click()} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
              <Camera size={14} /> {uploadFile ? uploadFile.name : 'Choose Photo'}
            </button>
            {uploadFile && (
              <button onClick={handleUpload} className="btn-success" disabled={uploadLoading} style={{ fontSize: '0.8rem' }}>
                {uploadLoading ? <><span className="spinner"></span> Processing AI...</> : <><Upload size={14} /> Submit for Verification</>}
              </button>
            )}
          </div>
          {uploadLoading && (
            <p style={{ fontSize: '0.78rem', color: '#fb923c', marginTop: '0.5rem' }}>
              ⏳ Running Gemini AI photo comparison...
            </p>
          )}
        </div>
      )}

      {['AWAITING_VERIFICATION', 'RESOLVED'].includes(c.status) && (
        <div style={{ background: '#14291e', border: '1px solid #16a34a', borderRadius: '8px', padding: '0.6rem 0.875rem', marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#4ade80', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={14} />
            {c.status === 'AWAITING_VERIFICATION' ? 'Completion photo submitted. Awaiting citizen confirmation.' : 'Complaint resolved.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/officer/complaints');
      setComplaints(res.data.complaints || []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load complaints from backend.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const filtered = complaints.filter(c => {
    if (filter === 'active') return !['RESOLVED'].includes(c.status);
    if (filter === 'overdue') return c.delay_status === 'OVERDUE';
    if (filter === 'awaiting') return c.status === 'AWAITING_VERIFICATION';
    return true;
  });

  const overdue = complaints.filter(c => c.delay_status === 'OVERDUE').length;

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Officer Dashboard</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            {user.name} · {user.department || 'All Departments'}
          </p>
        </div>
        <button onClick={fetchComplaints} className="btn-secondary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <RefreshCw size={15} className={loading ? 'spinner' : ''} /> Refresh
        </button>
      </div>

      {/* Error alert banner */}
      {error && (
        <div style={{ background: '#3b0808', border: '1px solid #dc2626', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <AlertCircle size={18} color="#f87171" />
            <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem' }}>{error}</span>
          </div>
          <button onClick={fetchComplaints} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Retry Request
          </button>
        </div>
      )}

      {overdue > 0 && (
        <div style={{ background: '#3b0808', border: '1px solid #dc2626', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16} color="#f87171" />
          <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem' }}>{overdue} complaint(s) are overdue!</span>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[['active', 'Active'], ['overdue', `Overdue (${overdue})`], ['awaiting', 'Awaiting Verification'], ['all', 'All Complaints']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            background: filter === val ? '#1e3a5f' : '#1e293b',
            border: `1px solid ${filter === val ? '#2563eb' : '#334155'}`,
            borderRadius: '8px', padding: '0.4rem 0.875rem',
            color: filter === val ? '#60a5fa' : '#94a3b8',
            cursor: 'pointer', fontSize: '0.825rem', fontWeight: filter === val ? 600 : 400,
            transition: 'all 0.15s'
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <div className="spinner" style={{ margin: '0 auto', width: '2rem', height: '2rem' }}></div>
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.85rem' }}>Loading assigned complaints from municipal office...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem', color: '#94a3b8' }}>
          <MapPin size={40} color="#475569" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>No Complaints Found</h3>
          <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
            There are currently no complaints assigned to your authorized office ({user.department || 'your department'}) under the "{filter}" tab.
          </p>
          <button onClick={fetchComplaints} className="btn-secondary" style={{ fontSize: '0.825rem' }}>
            <RefreshCw size={14} /> Check for New Complaints
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(c => (
            <ComplaintCard key={c.id} c={c} onStatusUpdate={fetchComplaints} />
          ))}
        </div>
      )}
    </div>
  );
}
