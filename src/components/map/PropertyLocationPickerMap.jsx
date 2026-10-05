import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Search, Navigation, Compass, Loader2, CheckCircle2,
  AlertCircle, Crosshair, Sparkles, X, ExternalLink
} from 'lucide-react';
import {
  getCoordinatesForDepartment,
  getCoordinatesForLocation,
  ZONE_COORDINATES
} from '../../data/guatemalaLocations';

// Custom Pin Marker Icon for the Property
const createPickerPinIcon = () => {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; pointer-events: auto; cursor: grab;">
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 9999px; background-color: rgba(229, 75, 34, 0.28); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <svg width="42" height="42" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <filter id="picker-shadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.35"/>
          </filter>
          <g filter="url(#picker-shadow)">
            <path d="M22 2C12.6 2 5 9.6 5 19C5 29.5 22 42 22 42C22 42 39 29.5 39 19C39 9.6 31.4 2 22 2Z" fill="#E54B22"/>
            <circle cx="22" cy="18" r="9" fill="#FFF5E8"/>
            <circle cx="22" cy="18" r="4.5" fill="#0B5D3B"/>
          </g>
        </svg>
      </div>
    `,
    className: 'property-location-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 42],
    popupAnchor: [0, -38],
  });
};

// Map click listener hook component
function MapEventsHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Controller to smoothly fly to coordinates when target changes
function MapFlyController({ target, zoom = 16 }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (target?.lat && target?.lng) {
      map.flyTo([target.lat, target.lng], zoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [target?.lat, target?.lng, zoom, map]);

  return null;
}

export default function PropertyLocationPickerMap({
  coordinates,
  department = 'Guatemala',
  zone = 'Zona 10 (Zona Viva / Oakland)',
  onLocationSelected,
  onAddressResolved,
}) {
  // Coordinates state: default to Guatemala City (Zone 10)
  const [currentCoords, setCurrentCoords] = useState(() => {
    if (coordinates?.lat && coordinates?.lng) {
      return { lat: Number(coordinates.lat), lng: Number(coordinates.lng) };
    }
    const defaultCoords = getCoordinatesForLocation(department, zone);
    return {
      lat: defaultCoords?.lat || 14.5975,
      lng: defaultCoords?.lng || -90.5106,
    };
  });

  const [flyTarget, setFlyTarget] = useState(null);
  const [flyZoom, setFlyZoom] = useState(16);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  // GPS geolocation state
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsNotice, setGpsNotice] = useState('');
  const [gpsError, setGpsError] = useState('');

  // Reverse geocode feedback
  const [detectedAddress, setDetectedAddress] = useState('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const markerIcon = useMemo(() => createPickerPinIcon(), []);
  const searchTimeoutRef = useRef(null);

  // Sync when initial coordinates prop changes from outside (e.g. edit mode loaded)
  useEffect(() => {
    if (coordinates?.lat && coordinates?.lng) {
      const newLat = Number(coordinates.lat);
      const newLng = Number(coordinates.lng);
      if (Math.abs(newLat - currentCoords.lat) > 0.0001 || Math.abs(newLng - currentCoords.lng) > 0.0001) {
        setCurrentCoords({ lat: newLat, lng: newLng });
        setFlyTarget({ lat: newLat, lng: newLng });
      }
    }
  }, [coordinates?.lat, coordinates?.lng]);

  // When user changes department or zone dropdowns, fly map to that area if no custom click has occurred yet
  useEffect(() => {
    if (!coordinates?.lat) {
      const zoneCoords = getCoordinatesForLocation(department, zone);
      if (zoneCoords?.lat && zoneCoords?.lng) {
        setCurrentCoords({ lat: zoneCoords.lat, lng: zoneCoords.lng });
        setFlyTarget({ lat: zoneCoords.lat, lng: zoneCoords.lng });
        setFlyZoom(zoneCoords.zoom || 14);
      }
    }
  }, [department, zone]);

  // Reverse geocoding helper (OpenStreetMap Nominatim)
  const performReverseGeocode = useCallback(async (lat, lng) => {
    setIsReverseGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          // Construct clean short Guatemalan reference
          const road = data.address?.road || data.address?.neighbourhood || data.address?.suburb || '';
          const cityZone = data.address?.city_district || data.address?.suburb || data.address?.town || data.address?.city || '';
          const cleanRef = [road, cityZone].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 3).join(',');

          setDetectedAddress(cleanRef || data.display_name);

          if (onAddressResolved) {
            onAddressResolved({
              fullAddress: data.display_name,
              reference: cleanRef || data.display_name,
              road: data.address?.road || '',
              municipality: data.address?.city || data.address?.town || data.address?.municipality || '',
              department: data.address?.state || '',
            });
          }
        }
      }
    } catch (err) {
      console.warn('Reverse geocode unavailable, using coordinate pin:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [onAddressResolved]);

  // Triggered when user clicks on map or drags the marker
  const handleSelectLocation = useCallback((lat, lng, shouldReverseGeocode = true) => {
    const newCoords = { lat: Number(lat), lng: Number(lng) };
    setCurrentCoords(newCoords);
    setGpsError('');

    if (onLocationSelected) {
      onLocationSelected(newCoords);
    }

    if (shouldReverseGeocode) {
      performReverseGeocode(lat, lng);
    }
  }, [onLocationSelected, performReverseGeocode]);

  // GPS: "Usar mi ubicación actual"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no admite geolocalización GPS.');
      return;
    }

    setIsLocatingGPS(true);
    setGpsNotice('');
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newCoords = { lat: latitude, lng: longitude };
        setCurrentCoords(newCoords);
        setFlyTarget(newCoords);
        setFlyZoom(17);
        setIsLocatingGPS(false);
        setGpsNotice(`Ubicación GPS fijada (precisión ±${Math.round(accuracy)}m)`);

        handleSelectLocation(latitude, longitude, true);
        window.setTimeout(() => setGpsNotice(''), 4500);
      },
      (err) => {
        setIsLocatingGPS(false);
        if (err.code === 1) {
          setGpsError('Permiso de GPS denegado. Permite el acceso a tu ubicación en el navegador.');
        } else if (err.code === 2) {
          setGpsError('No se pudo determinar tu posición actual. Intenta buscar la dirección en el mapa.');
        } else {
          setGpsError('Tiempo de espera agotado para el GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Search Address (Nominatim Geocoding API restricted to Guatemala)
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchResults([]);
    setShowResultsDropdown(true);

    try {
      // Search in Guatemala
      const fullQuery = query.toLowerCase().includes('guatemala') ? query : `${query}, Guatemala`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&countrycodes=gt&addressdetails=1&limit=5`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSearchResults(data);
        } else {
          // Fallback to local ZONE_COORDINATES lookup
          const cleanQ = query.toLowerCase().trim();
          const matchedKey = Object.keys(ZONE_COORDINATES).find((k) => cleanQ.includes(k));
          if (matchedKey) {
            const zc = ZONE_COORDINATES[matchedKey];
            setSearchResults([
              {
                place_id: 'local-' + matchedKey,
                display_name: `${matchedKey.toUpperCase()}, Guatemala`,
                lat: zc.lat,
                lon: zc.lng,
              },
            ]);
          } else {
            setSearchResults([]);
          }
        }
      }
    } catch (err) {
      console.warn('Geocoding search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Select a search result
  const handleSelectSearchResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const newCoords = { lat, lng };

    setCurrentCoords(newCoords);
    setFlyTarget(newCoords);
    setFlyZoom(17);
    setShowResultsDropdown(false);
    setSearchQuery(result.display_name.split(',')[0]);

    handleSelectLocation(lat, lng, true);
  };

  return (
    <div className="space-y-3">
      {/* ── Toolbar: Search Address + Current GPS Button ── */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search Input Bar */}
        <div className="relative flex-1">
          <div
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleSearchSubmit(e);
              }
            }}
            className="relative flex items-center"
          >
            <Search size={16} className="absolute left-3.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length > 2) {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  searchTimeoutRef.current = setTimeout(handleSearchSubmit, 600);
                }
              }}
              placeholder="Buscar dirección, colonia, calle o zona en Guatemala..."
              className="w-full rounded-xl border border-border-light bg-[#FDFBF7] py-2.5 pl-10 pr-24 text-xs font-bold text-cafe outline-none transition-all focus:border-forest focus:ring-2 focus:ring-forest/10"
            />
            <button
              type="button"
              onClick={handleSearchSubmit}
              disabled={isSearching}
              className="absolute right-1.5 rounded-lg bg-forest hover:bg-forest-dark text-white px-3 py-1.5 text-[11px] font-black transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSearching ? <Loader2 size={13} className="animate-spin" /> : 'Buscar'}
            </button>
          </div>

          {/* Autocomplete Search Results Dropdown */}
          {showResultsDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-border-light bg-white shadow-xl overflow-hidden animate-[fade-in_0.15s_ease-out]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#FAF7F2] border-b border-border-light">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                  Resultados encontrados ({searchResults.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowResultsDropdown(false)}
                  className="text-text-muted hover:text-cafe p-0.5"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border-light/60">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id || item.lat + item.lon}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-forest/5 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <MapPin size={15} className="text-terracota shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-cafe truncate text-xs">
                        {item.display_name.split(',')[0]}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {item.display_name.split(',').slice(1).join(',')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GPS Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocatingGPS}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-forest to-jade hover:opacity-95 text-white px-4 py-2.5 text-xs font-black transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
          title="Detectar automáticamente mi ubicación actual con GPS"
        >
          {isLocatingGPS ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Detectando GPS...</span>
            </>
          ) : (
            <>
              <Navigation size={15} className="rotate-45" />
              <span>Usar mi ubicación actual</span>
            </>
          )}
        </button>
      </div>

      {/* GPS Notice / Error Alerts */}
      {gpsNotice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800 animate-[fade-in_0.2s_ease-out]">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{gpsNotice}</span>
        </div>
      )}
      {gpsError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2 text-xs font-bold text-red-700 animate-[fade-in_0.2s_ease-out]">
          <AlertCircle size={15} className="text-red-600 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* ── Interactive Leaflet Map Box ── */}
      <div className="relative w-full h-[340px] sm:h-[380px] rounded-2xl overflow-hidden border-2 border-border-light shadow-md bg-crema">
        <MapContainer
          center={[currentCoords.lat, currentCoords.lng]}
          zoom={15}
          scrollWheelZoom={true}
          className="w-full h-full z-0 cursor-crosshair"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFlyController target={flyTarget} zoom={flyZoom} />
          <MapEventsHandler onMapClick={(lat, lng) => handleSelectLocation(lat, lng, true)} />

          {/* Draggable Property Marker */}
          <Marker
            position={[currentCoords.lat, currentCoords.lng]}
            icon={markerIcon}
            draggable={true}
            eventHandlers={{
              dragend(e) {
                const marker = e.target;
                const pos = marker.getLatLng();
                handleSelectLocation(pos.lat, pos.lng, true);
              },
            }}
          >
            <Popup className="custom-property-popup">
              <div className="p-1 text-center font-sans">
                <span className="text-[10px] font-black uppercase text-terracota block">
                  Ubicación de la Vivienda
                </span>
                <p className="text-xs font-bold text-cafe mt-0.5">
                  {detectedAddress || 'Punto fijado en el mapa'}
                </p>
                <span className="text-[9px] text-text-muted mt-1 block">
                  Puedes arrastrar este pin a la entrada exacta
                </span>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Top Floating Helper Badge */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-[400] pointer-events-none flex justify-center">
          <div className="rounded-full bg-cafe/85 backdrop-blur-md px-3.5 py-1 text-[11px] font-black text-white shadow-md flex items-center gap-1.5">
            <Crosshair size={13} className="text-dorado animate-pulse" />
            <span>Haz clic en el mapa o arrastra el pin rojo para marcar la ubicación exacta</span>
          </div>
        </div>

        {/* Bottom Location Indicator Bar */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[400] rounded-xl bg-white/95 backdrop-blur-md p-2.5 sm:px-4 sm:py-2.5 shadow-lg border border-border-light flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-terracota/10 text-terracota flex items-center justify-center shrink-0">
              <MapPin size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-cafe truncate">
                {isReverseGeocoding ? 'Identificando dirección...' : (detectedAddress || 'Ubicación seleccionada')}
              </p>
              <p className="text-[10px] font-semibold text-text-muted">
                Lat: {currentCoords.lat.toFixed(5)} • Lng: {currentCoords.lng.toFixed(5)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 flex items-center gap-1">
              <CheckCircle2 size={11} /> Mapeado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
