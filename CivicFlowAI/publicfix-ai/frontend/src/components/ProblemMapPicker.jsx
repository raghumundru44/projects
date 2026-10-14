import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search, CheckCircle2, AlertTriangle, Crosshair, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Reverse geocode latitude and longitude into detailed address components
 */
export async function reverseGeocodeCoords(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const resp = await fetch(url, {
      headers: {
        'Accept-Language': 'en'
      }
    });
    if (!resp.ok) throw new Error('Geocoding service unavailable');
    const data = await resp.json();
    const addr = data.address || {};

    const premise = addr.building || addr.house_name || addr.amenity || addr.shop || addr.office || '';
    const houseNumber = addr.house_number || '';
    const building = [houseNumber, premise].filter(Boolean).join(' ');
    const road = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || '';
    const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || addr.hamlet || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const district = addr.state_district || addr.county || addr.district || '';
    const state = addr.state || '';
    const postcode = addr.postcode || '';

    const hasExactStreet = Boolean(road || premise);

    let formattedAddress = '';
    if (hasExactStreet) {
      const parts = [
        building,
        road,
        neighbourhood,
        city,
        postcode
      ].filter(Boolean);
      // Remove accidental duplicate adjacent entries
      formattedAddress = parts.filter((item, idx, arr) => arr.indexOf(item) === idx).join(', ');
    } else {
      const parts = [
        neighbourhood,
        city,
        district,
        state,
        postcode
      ].filter(Boolean);
      formattedAddress = parts.filter((item, idx, arr) => arr.indexOf(item) === idx).join(', ');
    }

    if (!formattedAddress && data.display_name) {
      formattedAddress = data.display_name;
    }

    return {
      formattedAddress: formattedAddress || `Coordinates: ${lat}, ${lng}`,
      hasExactStreet,
      building,
      road,
      neighbourhood,
      city,
      district,
      state,
      postcode,
      displayName: data.display_name || ''
    };
  } catch (err) {
    console.error('Reverse geocode error:', err);
    return {
      formattedAddress: `Coordinates: ${lat}, ${lng}`,
      hasExactStreet: false,
      error: err.message
    };
  }
}

/**
 * Geocode text query into coordinates
 */
export async function searchAddressCoords(query) {
  if (!query || query.trim().length < 3) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    const resp = await fetch(url, {
      headers: {
        'Accept-Language': 'en'
      }
    });
    if (!resp.ok) throw new Error('Search failed');
    const data = await resp.json();
    if (!data || data.length === 0) return null;
    const item = data[0];
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    return {
      lat,
      lng: lon,
      displayName: item.display_name,
      address: item.address
    };
  } catch (err) {
    console.error('Search geocode error:', err);
    return null;
  }
}

export default function ProblemMapPicker({
  latitude,
  longitude,
  locationText,
  isExactStreet,
  onLocationChange
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Default coordinate center (Guntur: 16.3067, 80.4365 or Bangalore: 12.9716, 77.5946)
  const defaultLat = latitude ? parseFloat(latitude) : 16.3067;
  const defaultLng = longitude ? parseFloat(longitude) : 80.4365;

  // Initialize Leaflet map
  useEffect(() => {
    let checkInterval = null;

    const initMap = () => {
      if (!window.L || !mapContainerRef.current) return false;
      if (mapInstanceRef.current) return true;

      try {
        const L = window.L;
        const initialLat = latitude ? parseFloat(latitude) : defaultLat;
        const initialLng = longitude ? parseFloat(longitude) : defaultLng;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: latitude && longitude ? 17 : 14,
          zoomControl: true,
          attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // Custom pinpoint icon
        const customIcon = L.divIcon({
          className: 'problem-pin-marker',
          html: `<div style="
            background: #ef4444;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            border: 2px solid #ffffff;
            cursor: grab;
          ">
            <span style="transform: rotate(45deg); font-size: 14px; font-weight: bold;">📍</span>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        const marker = L.marker([initialLat, initialLng], {
          icon: customIcon,
          draggable: true
        }).addTo(map);

        marker.bindPopup(`<b>Problem Location</b><br/>Drag or click map to move pin.`).openPopup();

        // Handle marker drag
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          await handleNewCoordinates(pos.lat, pos.lng, true);
        });

        // Handle click on map to move marker
        map.on('click', async (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          map.panTo([lat, lng]);
          await handleNewCoordinates(lat, lng, true);
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
        setMapReady(true);
        return true;
      } catch (err) {
        console.error('Failed to initialize map:', err);
        return false;
      }
    };

    if (!initMap()) {
      checkInterval = setInterval(() => {
        if (initMap()) clearInterval(checkInterval);
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, []);

  // Update map and marker if external coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerInstanceRef.current) return;
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        const cur = markerInstanceRef.current.getLatLng();
        if (Math.abs(cur.lat - lat) > 0.00001 || Math.abs(cur.lng - lng) > 0.00001) {
          markerInstanceRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.setView([lat, lng], 17);
        }
      }
    }
  }, [latitude, longitude]);

  const handleNewCoordinates = async (lat, lng, doReverseGeocode = true) => {
    const latFixed = Number(lat.toFixed(6));
    const lngFixed = Number(lng.toFixed(6));

    if (doReverseGeocode) {
      const geo = await reverseGeocodeCoords(latFixed, lngFixed);
      onLocationChange({
        latitude: latFixed,
        longitude: lngFixed,
        locationText: geo.formattedAddress,
        isExactStreet: geo.hasExactStreet,
        unverified: !geo.hasExactStreet
      });
      if (geo.hasExactStreet) {
        toast.success('Exact problem address resolved from coordinates.');
      } else {
        toast('Locality coordinates set. Street address could not be verified.', {
          icon: '⚠️'
        });
      }
    } else {
      onLocationChange({
        latitude: latFixed,
        longitude: lngFixed
      });
    }
  };

  // High-accuracy GPS request
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    toast.loading('Acquiring precise GPS coordinates...', { id: 'gps-toast' });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        toast.dismiss('gps-toast');
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);

        if (mapInstanceRef.current && markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.setView([lat, lng], 17);
        }

        const geo = await reverseGeocodeCoords(lat, lng);
        onLocationChange({
          latitude: lat,
          longitude: lng,
          locationText: geo.formattedAddress,
          isExactStreet: geo.hasExactStreet,
          unverified: !geo.hasExactStreet
        });

        toast.success(`GPS acquired (±${accuracy}m accuracy). Address resolved.`);
        setGeoLoading(false);
      },
      (err) => {
        toast.dismiss('gps-toast');
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            toast.error('Location permission was denied. You can manually enter the address and click "Locate on Map".');
            break;
          case err.POSITION_UNAVAILABLE:
            toast.error('GPS position is unavailable. Please enter the address manually or pinpoint on the map.');
            break;
          case err.TIMEOUT:
            toast.error('GPS request timed out. Please try again or select your location on the map.');
            break;
          default:
            toast.error('Failed to get precise GPS coordinates.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Search address by text query
  const handleSearchAddress = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Enter an address, street, or landmark to search.');
      return;
    }

    setSearchLoading(true);
    const result = await searchAddressCoords(searchQuery.trim());
    setSearchLoading(false);

    if (!result) {
      toast.error('Could not determine exact coordinates for this address. Try dragging the pin on the map.');
      return;
    }

    const { lat, lng } = result;
    if (mapInstanceRef.current && markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], 17);
    }

    const geo = await reverseGeocodeCoords(lat, lng);
    onLocationChange({
      latitude: lat,
      longitude: lng,
      locationText: geo.formattedAddress || searchQuery,
      isExactStreet: geo.hasExactStreet,
      unverified: !geo.hasExactStreet
    });
    toast.success('Location found and pinned on map.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Search and GPS controls */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchAddress} style={{ display: 'flex', flex: 1, minWidth: '220px', gap: '0.4rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search street, landmark, or area..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2rem',
                fontSize: '0.85rem',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                height: '38px'
              }}
            />
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.65rem', top: '12px' }} />
          </div>
          <button
            type="submit"
            className="btn-secondary"
            disabled={searchLoading}
            style={{ fontSize: '0.8rem', padding: '0 0.8rem', height: '38px' }}
          >
            {searchLoading ? <span className="spinner" style={{ width: '12px', height: '12px' }}></span> : 'Find'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          className="btn-primary"
          style={{ fontSize: '0.825rem', height: '38px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {geoLoading ? (
            <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
          ) : (
            <Navigation size={14} />
          )}
          {geoLoading ? 'Acquiring GPS...' : 'Use Current Location'}
        </button>
      </div>

      {/* Map canvas */}
      <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155' }}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '260px',
            background: '#1e293b'
          }}
        />

        {/* Overlay instruction pill */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(4px)',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '0.3rem 0.6rem',
          fontSize: '0.75rem',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <Crosshair size={12} color="#60a5fa" />
          <span>Click map or drag the pin to set exact problem spot</span>
        </div>
      </div>

      {/* Coordinate & Accuracy Status Bar */}
      <div style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '0.6rem 0.875rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={14} color="#60a5fa" />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Confirmed Problem GPS:</span>
          {latitude && longitude ? (
            <code style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
              {latitude}, {longitude}
            </code>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
              Not set (click map or GPS button)
            </span>
          )}
        </div>

        {latitude && longitude && (
          <div>
            {isExactStreet ? (
              <span style={{
                fontSize: '0.75rem',
                color: '#4ade80',
                background: '#14291e',
                border: '1px solid #16a34a',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <CheckCircle2 size={12} /> Verified Street Address
              </span>
            ) : (
              <span style={{
                fontSize: '0.75rem',
                color: '#fbbf24',
                background: '#2b2106',
                border: '1px solid #d97706',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <AlertTriangle size={12} /> Locality Coords (Street Unverified)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
