import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Camera, MapPin, Navigation, Send, X, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Pothole/Road Damage', 'Garbage', 'Water Leakage', 'Drainage', 'Streetlight', 'Other'];
const CATEGORY_ICONS = { 'Pothole/Road Damage': '🚧', Garbage: '🗑️', 'Water Leakage': '💧', Drainage: '🌊', Streetlight: '💡', Other: '📋' };

export default function NewComplaintPage() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [form, setForm] = useState({
    title: '', description: '', category: '', location_text: '', latitude: '', longitude: ''
  });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Photo must be under 5MB.');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      return toast.error('Only JPEG, PNG, WebP, or GIF images are allowed.');
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const requestLocation = () => {
  if (!navigator.geolocation) {
    toast.error('Geolocation not supported by your browser.');
    return;
  }
  setGeoLoading(true);
  navigator.geolocation.getCurrentPosition(
        (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      // Perform reverse geocoding via Nominatim
      (async () => {
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`);
          if (!resp.ok) throw new Error('Nominatim request failed');
          const data = await resp.json();
          const addr = data.address || {};
          const parts = [
            addr.road,
            addr.neighbourhood,
            addr.suburb,
            addr.city,
            addr.town,
            addr.state,
            addr.postcode
          ].filter(Boolean);
          const locationText = parts.join(', ');
          setForm(f => ({ ...f, latitude: lat, longitude: lng, location_text: locationText || `Latitude: ${lat}, Longitude: ${lng}` }));
          toast.success('Location obtained and address resolved.');
        } catch (e) {
          console.error(e);
          setForm(f => ({ ...f, latitude: lat, longitude: lng, location_text: `Latitude: ${lat}, Longitude: ${lng}` }));
          toast.error('Reverse geocoding failed; using coordinates.');
        } finally {
          setGeoLoading(false);
        }
      })();
    },
    (err) => {
      // Reset any previously set coordinates
      setForm(f => ({ ...f, latitude: '', longitude: '', location_text: '' }));
      switch (err.code) {
        case err.PERMISSION_DENIED:
          toast.error('Location permission denied.');
          break;
        case err.POSITION_UNAVAILABLE:
          toast.error('Location information is unavailable.');
          break;
        case err.TIMEOUT:
          toast.error('Location request timed out.');
          break;
        default:
          toast.error('Failed to obtain location.');
      }
      setGeoLoading(false);
    },
    { timeout: 10000 }
  );
}

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) return toast.error('Please upload a photograph of the issue.');
    if (!form.category) return toast.error('Please select a category.');

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v); });
    data.append('photo', photo);

    setLoading(true);
    try {
      const res = await axios.post('/api/complaints', data);
      toast.success(`Complaint submitted! ID: ${res.data.complaintId}`);
      navigate(`/complaint/${res.data.complaintId}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit complaint.';
      const details = err.response?.data?.details;
      if (details) {
        Object.values(details).forEach(msgs => msgs.forEach(m => toast.error(m)));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Report Public Issue</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Submit a new municipal complaint with a photograph</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Photo Upload */}
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Issue Photograph (Required)
          </p>
          {preview ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={preview} alt="preview" style={{ maxHeight: '240px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #334155' }} />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); fileRef.current.value = ''; }}
                style={{
                  position: 'absolute', top: '-8px', right: '-8px',
                  background: '#dc2626', border: 'none', borderRadius: '50%',
                  width: '24px', height: '24px', cursor: 'pointer', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current.click()}
              style={{
                border: '2px dashed #334155', borderRadius: '12px', padding: '2.5rem',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; }}
            >
              <Camera size={40} color="#475569" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Click to upload photo</p>
              <p style={{ color: '#475569', fontSize: '0.8rem' }}>JPEG, PNG, WebP — max 5MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhoto} style={{ display: 'none' }} id="photo-input" />
          {!preview && <button type="button" className="btn-primary" onClick={() => fileRef.current.click()} style={{ marginTop: '0.75rem' }}>
            <Camera size={16} /> Choose Photo
          </button>}
        </div>

        {/* Title */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>Issue Title *</label>
          <input
            type="text"
            placeholder="Brief description of the problem"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            id="complaint-title"
          />
        </div>

        {/* Category */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>Category *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {CATEGORIES.map(cat => (
              <button type="button" key={cat}
                onClick={() => setForm(f => ({ ...f, category: cat }))}
                style={{
                  background: form.category === cat ? '#1e3a5f' : '#0f172a',
                  border: `1px solid ${form.category === cat ? '#2563eb' : '#334155'}`,
                  borderRadius: '8px', padding: '0.5rem 0.25rem',
                  color: form.category === cat ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: form.category === cat ? 600 : 400,
                  transition: 'all 0.15s', textAlign: 'center'
                }}
              >
                {CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>Description *</label>
          <textarea
            rows={4}
            placeholder="Describe the issue in detail — when did you notice it, how severe is it, any hazards?"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
            id="complaint-description"
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Location */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>Location / Address *</label>
          <input
            type="text"
            placeholder="Street address, landmark, or area name"
            value={form.location_text}
            onChange={e => setForm(f => ({ ...f, location_text: e.target.value }))}
            required
            id="complaint-location"
          />
          <button type="button" className="btn-location" onClick={requestLocation} disabled={geoLoading} style={{ marginTop: '0.5rem' }}>
            {geoLoading ? <span className="spinner" style={{width:'12px',height:'12px'}}></span> : <Navigation size={13} />}
            {geoLoading ? 'Getting location...' : 'Use my current location'}
          </button>


          {form.latitude && form.longitude && (
            <p style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin size={12} /> {form.latitude}, {form.longitude}
            </p>
          )}
        </div>

        {/* Demo notice */}
        <div style={{
          background: '#1a1200', border: '1px solid #3d2e00', borderRadius: '8px',
          padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
        }}>
          <AlertCircle size={15} color="#fbbf24" style={{ marginTop: '1px', minWidth: '15px' }} />
          <p style={{ fontSize: '0.8rem', color: '#9a7700', margin: 0, lineHeight: 1.5 }}>
            <strong style={{color:'#fbbf24'}}>Demo Notice:</strong> Office assignments use configurable demo routing rules, not verified official municipal contacts. Do not submit real personal data.
          </p>
        </div>

        <button type="submit" className="btn-primary" id="submit-complaint" disabled={loading} style={{ justifyContent: 'center', padding: '0.75rem' }}>
          {loading ? <><span className="spinner"></span> Submitting...</> : <><Send size={16} /> Submit Complaint</>}
        </button>
      </form>
    </div>
  );
}
