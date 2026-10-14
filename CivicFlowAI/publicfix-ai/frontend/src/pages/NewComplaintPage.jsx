import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Camera, MapPin, Send, X, AlertCircle, Search, CheckCircle, Navigation } from 'lucide-react';
import ProblemMapPicker, { searchAddressCoords, reverseGeocodeCoords } from '../components/ProblemMapPicker';

const CATEGORIES = ['Pothole/Road Damage', 'Garbage', 'Water Leakage', 'Drainage', 'Streetlight', 'Other'];
const CATEGORY_ICONS = { 'Pothole/Road Damage': '🚧', Garbage: '🗑️', 'Water Leakage': '💧', Drainage: '🌊', Streetlight: '💡', Other: '📋' };

export default function NewComplaintPage() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [form, setForm] = useState({
    title: '', description: '', category: '', location_text: '', latitude: '', longitude: ''
  });
  const [isExactStreet, setIsExactStreet] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);

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

  const handleLocationChange = (loc) => {
    setForm(f => ({
      ...f,
      latitude: loc.latitude !== undefined ? loc.latitude : f.latitude,
      longitude: loc.longitude !== undefined ? loc.longitude : f.longitude,
      location_text: loc.locationText !== undefined ? loc.locationText : f.location_text
    }));
    if (loc.isExactStreet !== undefined) {
      setIsExactStreet(loc.isExactStreet);
    }
  };

  const handleManualAddressLocate = async () => {
    if (!form.location_text.trim()) {
      return toast.error('Please enter an address or landmark first.');
    }
    setLocatingAddress(true);
    const result = await searchAddressCoords(form.location_text.trim());
    setLocatingAddress(false);
    if (!result) {
      toast('Could not determine exact coordinates for this address. Please click or drag the pin on the map.', {
        icon: 'ℹ️'
      });
      return;
    }
    const { lat, lng } = result;
    const geo = await reverseGeocodeCoords(lat, lng);
    setForm(f => ({
      ...f,
      latitude: lat,
      longitude: lng,
      location_text: geo.formattedAddress || f.location_text
    }));
    setIsExactStreet(geo.hasExactStreet);
    toast.success('Address coordinates found and pinned on map.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) return toast.error('Please upload a photograph of the issue.');
    if (!form.category) return toast.error('Please select a category.');
    if (!form.location_text.trim()) return toast.error('Please specify the problem location or address.');

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') data.append(k, v);
    });
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
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Report Public Issue</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Submit a new municipal complaint with exact problem location</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Photo Upload */}
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Issue Photograph (Required) *
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
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Click to upload issue photo</p>
              <p style={{ color: '#475569', fontSize: '0.8rem' }}>JPEG, PNG, WebP — max 5MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhoto} style={{ display: 'none' }} id="photo-input" />
          {!preview && (
            <button type="button" className="btn-primary" onClick={() => fileRef.current.click()} style={{ marginTop: '0.75rem' }}>
              <Camera size={16} /> Choose Photo
            </button>
          )}
        </div>

        {/* Title */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>Issue Title *</label>
          <input
            type="text"
            placeholder="e.g., Deep pothole in front of Main Market Road"
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
                  borderRadius: '8px', padding: '0.6rem 0.25rem',
                  color: form.category === cat ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: form.category === cat ? 600 : 400,
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
            placeholder="Describe the issue in detail — when did you notice it, how severe is it, hazards to traffic or pedestrians?"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
            id="complaint-description"
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Exact Problem Location Card with Map */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #334155' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                Exact Problem Location & Address *
              </label>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Where the issue is situated
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
              The location must represent where the public issue exists. Use high-accuracy GPS or drag the pin on the map to pinpoint the exact spot.
            </p>
          </div>

          {/* Interactive Map Picker */}
          <ProblemMapPicker
            latitude={form.latitude}
            longitude={form.longitude}
            locationText={form.location_text}
            isExactStreet={isExactStreet}
            onLocationChange={handleLocationChange}
          />

          {/* Confirmed Address Input with sync */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>
              Confirmed Problem Address (Auto-resolved from pin or enter manually) *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Street address, building, road, neighbourhood, or postal code"
                value={form.location_text}
                onChange={e => {
                  const val = e.target.value;
                  setForm(f => ({ ...f, location_text: val }));
                }}
                required
                id="complaint-location"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleManualAddressLocate}
                disabled={locatingAddress}
                className="btn-secondary"
                title="Find this address on the map"
                style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}
              >
                {locatingAddress ? <span className="spinner" style={{ width: '12px', height: '12px' }}></span> : <Search size={14} />} Locate
              </button>
            </div>
          </div>
        </div>

        {/* Automatic Municipal Assignment Notice */}
        <div style={{
          background: '#0d2137', border: '1px solid #1e3a5f', borderRadius: '8px',
          padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
        }}>
          <AlertCircle size={15} color="#60a5fa" style={{ marginTop: '2px', minWidth: '15px' }} />
          <p style={{ fontSize: '0.8rem', color: '#93c5fd', margin: 0, lineHeight: 1.5 }}>
            <strong>Automatic Municipal Office Routing:</strong> Your complaint will be routed to the nearest verified municipal office responsible for this category and jurisdiction using Haversine distance. If no verified office handles the category, it will be marked UNASSIGNED for administrative review.
          </p>
        </div>

        <button type="submit" className="btn-primary" id="submit-complaint" disabled={loading} style={{ justifyContent: 'center', padding: '0.75rem' }}>
          {loading ? <><span className="spinner"></span> Submitting...</> : <><Send size={16} /> Submit Complaint</>}
        </button>
      </form>
    </div>
  );
}

