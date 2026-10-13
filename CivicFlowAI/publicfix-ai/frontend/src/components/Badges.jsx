export function StatusBadge({ status }) {
  const labels = {
    SUBMITTED: 'Submitted',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    AWAITING_VERIFICATION: 'Awaiting Verification',
    RESOLVED: 'Resolved',
    REOPENED: 'Reopened',
  };
  return (
    <span className={`badge-${status}`} style={{
      padding: '0.2rem 0.625rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      display: 'inline-block',
      whiteSpace: 'nowrap'
    }}>
      {labels[status] || status}
    </span>
  );
}

export function DelayBadge({ delayStatus }) {
  const icons = {
    ON_TRACK: '✓',
    APPROACHING: '⚠',
    OVERDUE: '🔴',
    NO_DEADLINE: '–',
  };
  const labels = {
    ON_TRACK: 'On Track',
    APPROACHING: 'Due Soon',
    OVERDUE: 'Overdue',
    NO_DEADLINE: 'No Deadline',
  };
  return (
    <span className={`delay-${delayStatus}`} style={{ fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      {icons[delayStatus]} {labels[delayStatus]}
    </span>
  );
}

export function VerdictBadge({ verdict }) {
  const labels = {
    LIKELY_RESOLVED: 'Likely Resolved',
    NOT_RESOLVED: 'Not Resolved',
    NEEDS_REVIEW: 'Needs Review',
  };
  return (
    <span className={`verdict-${verdict}`} style={{
      padding: '0.25rem 0.75rem',
      borderRadius: '999px',
      fontSize: '0.8rem',
      fontWeight: 700,
      display: 'inline-block'
    }}>
      {labels[verdict] || verdict}
    </span>
  );
}

export function PhotoDisplay({ filename, label, alt }) {
  if (!filename) return (
    <div style={{
      width: '100%', aspectRatio: '4/3',
      background: '#0f172a', borderRadius: '8px',
      border: '2px dashed #334155',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#475569', fontSize: '0.875rem', flexDirection: 'column', gap: '0.5rem'
    }}>
      <span>📷</span>
      <span>{label || 'No photo'}</span>
    </div>
  );

  return (
    <div>
      {label && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>}
      <img
        src={`/uploads/${filename}`}
        alt={alt || label || 'photo'}
        style={{
          width: '100%', borderRadius: '8px',
          border: '1px solid #334155',
          objectFit: 'cover', aspectRatio: '4/3',
          background: '#0f172a'
        }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}
