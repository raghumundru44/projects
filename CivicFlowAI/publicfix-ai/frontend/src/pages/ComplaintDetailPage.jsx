import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, DelayBadge, PhotoDisplay } from '../components/Badges';
import { MapPin, Calendar, Building2, Clock, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

function Timeline({ history }) {
  return (
    <div>
      {history.map((h, i) => (
        <div key={h.id} className="timeline-item">
          <div className="timeline-dot" style={{
            background: h.new_status === 'RESOLVED' ? '#4ade80' :
                       h.new_status === 'REOPENED' ? '#f87171' :
                       h.new_status === 'AWAITING_VERIFICATION' ? '#fb923c' : '#60a5fa'
          }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.15rem' }}>
            {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}
          </div>
          {h.note && <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.15rem' }}>{h.note}</div>}
          <div style={{ fontSize: '0.75rem', color: '#475569' }}>
            {new Date(h.changed_at).toLocaleString()} · {h.changed_by_name} ({h.changed_by_role})
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ComplaintDetailPage() {
  const { complaintId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/complaints/${complaintId}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load complaint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [complaintId]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <p style={{ color: '#f87171' }}>{error}</p>
      <Link to="/dashboard" className="btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
        <ArrowLeft size={16} /> Back
      </Link>
    </div>
  );

  const { complaint, photos, history, verification } = data;
  const originalPhoto = photos.find(p => p.photo_type === 'original');
  const completionPhoto = photos.find(p => p.photo_type === 'completion');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.35rem' }}>{complaint.title}</h1>
            <code style={{ fontSize: '0.8rem', color: '#60a5fa', background: '#0f172a', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              {complaint.complaint_id}
            </code>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
            <StatusBadge status={complaint.status} />
            <DelayBadge delayStatus={complaint.delay_status} />
          </div>
        </div>

        <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '1rem' }}>{complaint.description}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          <InfoItem icon={<span>📋</span>} label="Category" value={complaint.category} />
          <InfoItem icon={<MapPin size={14} />} label="Location / Address" value={complaint.location_text} />
          {complaint.latitude != null && complaint.longitude != null && (
            <InfoItem icon={<MapPin size={14} color="#38bdf8" />} label="GPS Coordinates" value={`${complaint.latitude}, ${complaint.longitude}`} />
          )}
          <InfoItem icon={<Calendar size={14} />} label="Submitted" value={new Date(complaint.submitted_at).toLocaleString()} />
          {complaint.assigned_office && (
            <>
              <InfoItem icon={<Building2 size={14} />} label="Assigned Office" value={complaint.assigned_office} />
              {complaint.distance != null && (
                <InfoItem icon={<MapPin size={14} />} label="Distance to Office" value={`≈ ${complaint.distance.toFixed(2)} km`} />
              )}
            </>
          )}
          {complaint.due_date && <InfoItem icon={<Clock size={14} />} label="Target Due" value={new Date(complaint.due_date).toLocaleDateString()} />}
          {complaint.officer_name && <InfoItem icon={<span>👮</span>} label="Officer" value={complaint.officer_name} />}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Original Photo */}
        <div className="card">
          <PhotoDisplay filename={originalPhoto?.filename} label="Original Problem Photo" alt="original issue" />
        </div>

        {/* Completion Photo */}
        <div className="card">
          {completionPhoto ? (
            <PhotoDisplay filename={completionPhoto?.filename} label="Completion Photo" alt="after fix" />
          ) : (
            <div style={{
              width: '100%', aspectRatio: '4/3', border: '2px dashed #334155', borderRadius: '8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', color: '#475569'
            }}>
              <span style={{ fontSize: '2rem' }}>📷</span>
              <span style={{ fontSize: '0.8rem' }}>No completion photo yet</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Verification card */}
      {verification && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🤖 AI Assessment
          </h3>
          <div className={`verdict-${verification.ai_verdict}`} style={{
            padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1rem',
            fontWeight: 700, display: 'inline-block'
          }}>
            {verification.ai_verdict?.replace(/_/g, ' ')}
          </div>
          {verification.ai_explanation && (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              <strong style={{ color: '#f1f5f9' }}>Explanation: </strong>{verification.ai_explanation}
            </p>
          )}
          {verification.ai_evidence && (
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              <strong style={{ color: '#f1f5f9' }}>Evidence: </strong>{verification.ai_evidence}
            </p>
          )}
          {verification.ai_limitations && (
            <p style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.6, fontStyle: 'italic' }}>
              ⚠️ Limitations: {verification.ai_limitations}
            </p>
          )}
          {verification.human_action && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem', borderRadius: '8px',
              background: verification.human_action === 'CONFIRMED' ? '#14291e' : '#3b0808',
              border: `1px solid ${verification.human_action === 'CONFIRMED' ? '#16a34a' : '#dc2626'}`
            }}>
              <strong>{verification.human_action === 'CONFIRMED' ? '✅ Confirmed resolved' : '❌ Disputed'}</strong>
              {verification.dispute_reason && <p style={{ color: '#94a3b8', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                Reason: {verification.dispute_reason}
              </p>}
            </div>
          )}

          {/* Human action buttons */}
          {complaint.status === 'AWAITING_VERIFICATION' && (user.role === 'citizen' || user.role === 'admin') && !verification.human_action && (
            <Link to={`/complaint/${complaintId}/verify`} className="btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
              <CheckCircle size={16} /> Review & Confirm Resolution
            </Link>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Status Timeline</h3>
        {history.length > 0 ? <Timeline history={history} /> : (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No history yet.</p>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: '0.875rem', color: '#f1f5f9', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
