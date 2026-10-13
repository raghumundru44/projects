import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { VerdictBadge } from '../components/Badges';
import { getUploadUrl } from '../utils/config';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function VerificationPage() {
  const { complaintId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`/api/complaints/${complaintId}`);
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load complaint.');
      } finally {
        setLoading(false);
      }
    })();
  }, [complaintId]);

  const handleConfirm = async () => {
    if (!action) return toast.error('Please choose an action.');
    if (action === 'DISPUTED' && disputeReason.trim().length < 5) {
      return toast.error('Please provide a detailed dispute reason (at least 5 characters).');
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`/api/verification/${complaintId}/confirm`, {
        action,
        dispute_reason: action === 'DISPUTED' ? disputeReason : undefined
      });
      toast.success(res.data.message);
      navigate(`/complaint/${complaintId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit verification action.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
    </div>
  );

  if (!data) return null;

  const { complaint, photos, verification } = data;
  const originalPhoto = photos.find(p => p.photo_type === 'original');
  const completionPhoto = photos.find(p => p.photo_type === 'completion');

  const canAct = complaint.status === 'AWAITING_VERIFICATION' && !verification?.human_action &&
    (user.role === 'citizen' || user.role === 'admin');

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', padding: '2rem' }}>
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={15} /> Back
      </button>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Photo Verification Review</h1>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
        {complaint.title} · <code style={{ color: '#60a5fa' }}>{complaint.complaint_id}</code>
      </p>

      {/* Side-by-side photos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            📷 Original Problem Photo
          </p>
          {originalPhoto ? (
            <img src={getUploadUrl(originalPhoto.filename)} alt="original" style={{
              width: '100%', borderRadius: '8px', border: '1px solid #334155', aspectRatio: '4/3', objectFit: 'cover'
            }} />
          ) : <p style={{ color: '#475569' }}>No original photo</p>}
          <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
            Submitted: {new Date(complaint.submitted_at).toLocaleString()}
          </p>
        </div>

        <div className="card">
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            ✅ Completion Photo (Officer Uploaded)
          </p>
          {completionPhoto ? (
            <img src={getUploadUrl(completionPhoto.filename)} alt="completion" style={{
              width: '100%', borderRadius: '8px', border: '1px solid #334155', aspectRatio: '4/3', objectFit: 'cover'
            }} />
          ) : <p style={{ color: '#475569' }}>No completion photo</p>}
          {completionPhoto && (
            <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
              Uploaded: {new Date(completionPhoto.uploaded_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* AI Assessment */}
      {verification && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🤖 Gemini AI Assessment
            </h2>
            <VerdictBadge verdict={verification.ai_verdict} />
          </div>

          <div style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: '#f1f5f9' }}>Explanation: </strong>{verification.ai_explanation}
            </p>
          </div>

          {verification.ai_evidence && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Visible Evidence</p>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>{verification.ai_evidence}</p>
            </div>
          )}

          {verification.ai_limitations && (
            <div style={{ background: '#1a1200', border: '1px solid #3d2e00', borderRadius: '8px', padding: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#9a7700', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <AlertTriangle size={14} style={{ marginTop: '1px', minWidth: '14px' }} />
                <span><strong>AI Limitations: </strong>{verification.ai_limitations}</span>
              </p>
            </div>
          )}

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              ⚠️ <strong style={{ color: '#94a3b8' }}>Important:</strong> This AI assessment is advisory only.
              It does not constitute official verification. The complaint will only be marked RESOLVED after human confirmation.
              AI assessment time: {verification.ai_assessed_at ? new Date(verification.ai_assessed_at).toLocaleString() : 'Unknown'}
            </p>
          </div>
        </div>
      )}

      {/* Human action */}
      {canAct ? (
        <div className="card">
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>Your Decision</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Review the photos and AI assessment above. Based on your judgment:
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setAction('CONFIRMED')}
              style={{
                flex: 1, minWidth: '200px',
                background: action === 'CONFIRMED' ? '#14291e' : '#0f172a',
                border: `2px solid ${action === 'CONFIRMED' ? '#16a34a' : '#334155'}`,
                borderRadius: '10px', padding: '1rem',
                color: action === 'CONFIRMED' ? '#4ade80' : '#94a3b8',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
              }}
            >
              <CheckCircle size={24} style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Confirm Resolved</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>The issue appears to be fixed</div>
            </button>

            <button
              onClick={() => setAction('DISPUTED')}
              style={{
                flex: 1, minWidth: '200px',
                background: action === 'DISPUTED' ? '#3b0808' : '#0f172a',
                border: `2px solid ${action === 'DISPUTED' ? '#dc2626' : '#334155'}`,
                borderRadius: '10px', padding: '1rem',
                color: action === 'DISPUTED' ? '#f87171' : '#94a3b8',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
              }}
            >
              <XCircle size={24} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Dispute Resolution</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>The issue is not actually fixed</div>
            </button>
          </div>

          {action === 'DISPUTED' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>
                Dispute Reason (required) *
              </label>
              <textarea
                rows={3}
                placeholder="Describe specifically why the issue has not been resolved..."
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                id="dispute-reason"
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          {action && (
            <button onClick={handleConfirm} disabled={submitting}
              className={action === 'CONFIRMED' ? 'btn-success' : 'btn-danger'}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              id="submit-verification"
            >
              {submitting ? <><span className="spinner"></span> Processing...</> :
                action === 'CONFIRMED' ? <><CheckCircle size={16} /> Confirm — Mark as RESOLVED</> :
                <><XCircle size={16} /> Submit Dispute — Reopen Complaint</>
              }
            </button>
          )}
        </div>
      ) : verification?.human_action ? (
        <div className="card" style={{
          background: verification.human_action === 'CONFIRMED' ? '#14291e' : '#3b0808',
          border: `1px solid ${verification.human_action === 'CONFIRMED' ? '#16a34a' : '#dc2626'}`
        }}>
          <p style={{ fontWeight: 700, color: verification.human_action === 'CONFIRMED' ? '#4ade80' : '#f87171' }}>
            {verification.human_action === 'CONFIRMED' ? '✅ Resolution Confirmed' : '❌ Resolution Disputed'}
          </p>
          {verification.dispute_reason && <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Reason: {verification.dispute_reason}</p>}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', color: '#94a3b8' }}>
          {complaint.status !== 'AWAITING_VERIFICATION'
            ? `This complaint is in ${complaint.status} status — verification actions not available.`
            : 'Waiting for citizen or admin to confirm resolution.'}
        </div>
      )}
    </div>
  );
}
