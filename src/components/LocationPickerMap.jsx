import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

export default function LocationPickerMap({ initialAddress, onLocationChange }) {
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const markerRef = useRef(null);
    const [isLocating, setIsLocating] = useState(false);

    // Amravati default center
    const defaultCenter = [20.937422, 77.779551];

    useEffect(() => {
        if (mapRef.current) return; // Map already initialized

        const map = L.map(mapContainerRef.current).setView(defaultCenter, 13);
        mapRef.current = map;

        // Use standard OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add initial marker
        markerRef.current = L.marker(defaultCenter, { draggable: true }).addTo(map);

        // Handle map clicks
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            updateLocation(lat, lng);
        });

        // Handle marker drag
        markerRef.current.on('dragend', (e) => {
            const position = e.target.getLatLng();
            updateLocation(position.lat, position.lng);
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const updateLocation = async (lat, lng) => {
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        }
        if (mapRef.current) {
            mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: true });
        }

        try {
            // Reverse geocode
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            if (res.ok) {
                const data = await res.json();
                const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                const zone = data.address?.suburb || data.address?.city_district || data.address?.neighbourhood || '';
                onLocationChange({ lat, lng, address, zone });
            } else {
                onLocationChange({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, zone: '' });
            }
        } catch (err) {
            console.error('[LocationPicker] Reverse geocode failed:', err);
            onLocationChange({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, zone: '' });
        }
    };

    const handleGetGPS = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                updateLocation(latitude, longitude);
                setIsLocating(false);
            },
            (err) => {
                console.error('[LocationPicker] Geolocation error:', err);
                alert('Unable to retrieve your location. Check browser permissions.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '300px', backgroundColor: '#e5e7eb' }} />

            <button
                type="button"
                onClick={handleGetGPS}
                disabled={isLocating}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '10px',
                    zIndex: 1000,
                    backgroundColor: '#fff',
                    border: '2px solid rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    fontSize: '13px',
                    color: '#333'
                }}
            >
                {isLocating ? 'Locating...' : '📍 Use My GPS'}
            </button>
        </div>
    );
}
