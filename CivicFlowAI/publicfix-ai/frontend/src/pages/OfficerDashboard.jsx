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
          <h3 style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '1rem' }}>{c.title}</h3>
          <code style={{ fontSize: '0.75rem', color: '#60a5fa' }}>{c.complaint_id}</code>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <DelayBadge delayStatus={c.delay_status} />
          <StatusBadge status={c.status} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <MapPin size={12} /> {c.location_text}
          {c.distance && (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin size={12} />≈ {c.distance.toFixed(2)} km
            </span>
          )}
        </span>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          👤 {c.citizen_name}
          📧 {c.citizen_email}
        </span>
        {c.due_date && (
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={12} /> Due: {new Date(c.due_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Photo preview */}
      {c.original_photo && (
        <img src={getUploadUrl(c.original_photo)} alt="issue"
          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155', marginBottom: '1rem' }} />
      )}

      {/* Status update */}
      {allowStatusChange && (
        <div style={{ borderTop: '1px solid #334155', paddingTop: '0.875rem', marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Update Status</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
              <option value="">Select status...</option>
              {VALID_TRANSITIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button onClick={handleStatus} className="btn-primary" disabled={statusLoading} style={{ whiteSpace: 'nowrap' }}>
              {statusLoading ? <span className="spinner"></span> : <CheckCircle size={15} />} Update
            </button>
          </div>
          <input
            type="text" placeholder="Optional note..."
            value={note} onChange={e => setNote(e.target.value)}
            style={{ marginTop: '0.5rem' }}
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
  const [filter, setFilter] = useState('active');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/officer/complaints');
      setComplaints(res.data.complaints);
    } catch (err) {
      toast.error('Failed to load complaints.');
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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Officer Dashboard</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{user.name} · {user.department}</p>
        </div>
        <button onClick={fetchComplaints} className="btn-secondary">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {overdue > 0 && (
        <div style={{ background: '#3b0808', border: '1px solid #dc2626', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16} color="#f87171" />
          <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem' }}>{overdue} complaint(s) are overdue!</span>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[['active', 'Active'], ['overdue', `Overdue (${overdue})`], ['awaiting', 'Awaiting Verification'], ['all', 'All']].map(([val, label]) => (
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
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto', width: '2rem', height: '2rem' }}></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          No complaints found for this filter.
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
