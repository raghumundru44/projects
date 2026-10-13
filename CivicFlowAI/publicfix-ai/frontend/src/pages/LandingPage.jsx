import { Link } from 'react-router-dom';
import { Shield, Camera, Building2, Clock, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';

const features = [
  {
    icon: <Camera size={28} color="#60a5fa" />,
    title: 'Report with Photos',
    desc: 'Citizens submit public issues with photographs and location details. Get a unique complaint ID instantly.',
    color: '#1e3a5f'
  },
  {
    icon: <Building2 size={28} color="#a78bfa" />,
    title: 'Smart Office Routing',
    desc: 'Issues are automatically routed to the appropriate municipal department based on category (demo mappings).',
    color: '#2d1b69'
  },
  {
    icon: <Clock size={28} color="#fb923c" />,
    title: 'Track Progress & Delays',
    desc: 'Monitor complaint status, deadlines, and history. Get alerts when complaints are overdue.',
    color: '#3d2006'
  },
  {
    icon: <CheckCircle2 size={28} color="#4ade80" />,
    title: 'AI Photo Verification',
    desc: 'Officers upload completion photos. Gemini AI compares before/after and provides a structured verdict. Human confirmation required.',
    color: '#14291e'
  },
];

const workflow = [
  { step: '01', title: 'Citizen Reports Issue', desc: 'Submit a report with photo, description, category, and location.' },
  { step: '02', title: 'Auto-Routed to Department', desc: 'System assigns complaint to relevant municipal office (demo routing).' },
  { step: '03', title: 'Officer Works on Fix', desc: 'Officer updates status and uploads completion photo when done.' },
  { step: '04', title: 'AI Verifies + Human Confirms', desc: 'Gemini analyzes photos. Citizen confirms or disputes. Only then is it resolved.' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0f172a 40%, #1a0a2e 100%)',
        padding: '5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)',
            borderRadius: '999px', padding: '0.3rem 1rem', marginBottom: '2rem',
            fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600
          }}>
            <AlertCircle size={14} />
            Hackathon Demo — Not Official Government Software
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #f1f5f9 0%, #60a5fa 50%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.15,
            marginBottom: '1.25rem'
          }}>
            PublicFix AI
          </h1>
          <p style={{ fontSize: '1.3rem', color: '#60a5fa', fontWeight: 600, marginBottom: '0.75rem' }}>
            Public Issue Resolution & Verification System
          </p>
          <p style={{ fontSize: '1rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Report potholes, garbage, water leaks, and more. Track progress in real time.
            AI-powered photo comparison verifies resolutions — with required human confirmation.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
              Get Started <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
              Login with Demo Account
            </Link>
          </div>

          <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#475569' }}>
            Demo accounts: citizen@demo.com · officer@demo.com · admin@demo.com (all: demo1234)
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Four Core Features
        </h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '3rem' }}>
          End-to-end workflow from report to verified resolution
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem'
        }}>
          {features.map((f, i) => (
            <div key={i} className="card fade-in" style={{
              background: f.color,
              border: `1px solid ${f.color}`,
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.05rem' }}>{f.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section style={{ padding: '3rem 2rem 5rem', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '3rem' }}>
          How It Works
        </h2>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {workflow.map((w, i) => (
            <div key={i} className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '3.5rem', height: '3.5rem',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1rem', color: 'white', letterSpacing: '0.05em'
              }}>
                {w.step}
              </div>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '1rem' }}>{w.title}</h3>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section style={{
        background: '#1e293b', borderTop: '1px solid #334155',
        padding: '2rem', textAlign: 'center'
      }}>
        <p style={{ color: '#64748b', fontSize: '0.8rem', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
          ⚠️ <strong style={{color:'#94a3b8'}}>Disclaimer:</strong> This is a hackathon demonstration.
          Office routing rules and deadlines are configurable demo mappings — not official municipal assignments or service-level agreements.
          AI image comparison is advisory only and does not constitute official proof of resolution.
          Do not submit real personal data in this demo.
        </p>
      </section>
    </div>
  );
}
