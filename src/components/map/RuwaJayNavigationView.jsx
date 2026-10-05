import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation, Compass, Play, Pause, RotateCcw, Clock, MapPin, Gauge,
  Layers, Eye, CheckCircle2, ChevronRight, Zap, ArrowRight, ShieldCheck,
  Share2, Maximize2, Minimize2, Car, Footprints, Bike, Sparkles,
  Building2, AlertCircle, CornerDownRight, CornerDownLeft, ArrowUp, Flag,
  Plus, Minus, Volume2, VolumeX, Locate, LocateFixed, Crosshair, Radio,
  HelpCircle, X, Check, Camera, Route as RouteIcon, GitCommit,
  Search, Navigation2, Satellite, Map as MapIcon, Pencil, CircleDot,
  Signal, Mic, MicOff, ChevronDown, ChevronUp, Target, Move3d, Home, SlidersHorizontal
} from 'lucide-react';
import { formatDistance, formatPrice } from '../../data/properties';

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();

// ==========================================
// CUSTOM RUWAJAY MARKER ICONS
// ==========================================

// 1. Origin Beacon Marker (Where the person is) — Premium glowing design
const createOriginIcon = () =>
  L.divIcon({
    html: `
      <div style="position: relative; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
        <div style="position: absolute; inset: -4px; border-radius: 9999px; background: radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, transparent 70%); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; inset: 0; border-radius: 9999px; background: radial-gradient(circle, rgba(11, 93, 59, 0.3) 0%, transparent 60%);"></div>
        <div style="width: 30px; height: 30px; border-radius: 9999px; background: linear-gradient(135deg, #0B5D3B 0%, #10B981 100%); border: 3px solid #FFF5E8; box-shadow: 0 0 20px rgba(16, 185, 129, 0.6), 0 4px 14px rgba(11, 93, 59, 0.4); display: flex; align-items: center; justify-content: center;">
          <div style="width: 10px; height: 10px; border-radius: 9999px; background: #D4962A; box-shadow: 0 0 8px rgba(212, 150, 42, 0.8);"></div>
        </div>
      </div>
    `,
    className: 'ruwajay-origin-marker',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26],
  });

// 2. Destination Landmark Pin (The House destination) — Luxury 3D pin
const createDestinationIcon = (price) =>
  L.divIcon({
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto; cursor: pointer; filter: drop-shadow(0 8px 20px rgba(216, 68, 32, 0.5));">
        <!-- Floating Price Pill -->
        <div style="background: linear-gradient(135deg, #0B5D3B 0%, #084a2f 100%); color: #FFF5E8; font-weight: 900; font-size: 11px; padding: 3px 10px; border-radius: 9999px; border: 2px solid #D4962A; margin-bottom: 3px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.35), 0 0 12px rgba(212, 150, 42, 0.3);">
          ${price ? formatPrice(price) : '🏠 Destino'}
        </div>
        <!-- House 3D Pin -->
        <div style="position: relative; width: 42px; height: 42px; background: linear-gradient(135deg, #D84420 0%, #E54B22 50%, #F07824 100%); border-radius: 14px; border: 3px solid #FFF5E8; display: flex; align-items: center; justify-content: center; transform: rotate(-45deg); box-shadow: 0 6px 18px rgba(216, 68, 32, 0.5), inset 0 -2px 4px rgba(0,0,0,0.2);">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFF5E8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
          </div>
        </div>
        <!-- Pin Tip Pointer -->
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #D84420; margin-top: -2px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));"></div>
      </div>
    `,
    className: 'ruwajay-dest-marker',
    iconSize: [64, 68],
    iconAnchor: [32, 68],
    popupAnchor: [0, -70],
  });

// 3. Traveler Vehicle / Pedestrian Simulation Marker — Premium animated
const createTravelerIcon = (bearing = 0) =>
  L.divIcon({
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: -5px; border-radius: 9999px; background: radial-gradient(circle, rgba(212, 150, 42, 0.4) 0%, transparent 70%); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 40px; height: 40px; border-radius: 9999px; background: linear-gradient(135deg, #D84420 0%, #D4962A 50%, #0B5D3B 100%); border: 3px solid #FFF5E8; box-shadow: 0 0 24px rgba(212, 150, 42, 0.5), 0 6px 18px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; transform: rotate(${bearing}deg); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFF5E8" stroke="#FFF5E8" stroke-width="1.5">
            <path d="M12 2L4 21L12 17L20 21L12 2Z"/>
          </svg>
        </div>
      </div>
    `,
    className: 'ruwajay-traveler-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

// Calculate bearing angle between two coordinates
function calculateBearing(startLat, startLng, endLat, endLng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const φ1 = toRad(startLat);
  const φ2 = toRad(endLat);
  const Δλ = toRad(endLng - startLng);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (toDeg(θ) + 360) % 360;
}

// Controller for bounds fitting and camera following
function MapBoundsController({ coordinates, origin, destination, targetFocus, vehiclePos, followVehicle }) {
  const map = useMap();

  useEffect(() => {
    if (followVehicle && vehiclePos) {
      map.panTo(vehiclePos, { animate: true, duration: 0.4 });
    }
  }, [followVehicle, vehiclePos, map]);

  useEffect(() => {
    if (targetFocus) {
      map.flyTo(targetFocus, 16, { duration: 1 });
      return;
    }

    const fitRoute = () => {
      map.invalidateSize();
      const allPoints = [];
      if (Array.isArray(coordinates) && coordinates.length > 0) {
        allPoints.push(...coordinates);
      }
      if (origin?.lat && origin?.lng) {
        allPoints.push([origin.lat, origin.lng]);
      }
      if (destination?.lat && destination?.lng) {
        allPoints.push([destination.lat, destination.lng]);
      }

      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            paddingTopLeft: [50, 140],
            paddingBottomRight: [50, 160],
            maxZoom: 15,
            animate: true,
          });
        }
      }
    };

    const t1 = setTimeout(fitRoute, 120);
    const t2 = setTimeout(fitRoute, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, coordinates, origin, destination, targetFocus]);

  return null;
}

// ==========================================
// GUATEMALA ZONE PRESETS FOR INSTANT ROUTING
// ==========================================
const GUATEMALA_PRESETS = [
  { name: 'Zona 10, Ciudad de Guatemala (Zona Viva)', lat: 14.5982, lng: -90.5126, short: 'Zona 10' },
  { name: 'Zona 14, Ciudad de Guatemala (La Villa)', lat: 14.5823, lng: -90.5178, short: 'Zona 14' },
  { name: 'Ciudad Cayalá, Zona 16, Guatemala', lat: 14.6094, lng: -90.4856, short: 'Cayalá (Z. 16)' },
  { name: 'Carretera a El Salvador, Km 14', lat: 14.5458, lng: -90.4612, short: 'Carr. a El Salvador' },
  { name: 'Antigua Guatemala, Sacatepéquez', lat: 14.5573, lng: -90.7332, short: 'Antigua Guatemala' },
  { name: 'Zona 1, Centro Histórico, Guatemala', lat: 14.6416, lng: -90.5132, short: 'Zona 1 (Centro)' },
  { name: 'Calzada Roosevelt, Mixco / Guatemala', lat: 14.6295, lng: -90.5621, short: 'Calz. Roosevelt' },
];

// ==========================================
// ADDRESS SEARCH COMPONENT WITH GEOCODING
// ==========================================
function AddressSearchBar({
  onSelectDestination,
  onSelectOrigin,
  speakAssistant,
  currentDestAddress,
  currentOriginAddress,
  onUseCurrentGPS,
  isTracking,
}) {
  const [searchTarget, setSearchTarget] = useState('destination'); // 'destination' | 'origin'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchTimeout = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use Nominatim OpenStreetMap geocoder with Spanish language preference
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=6&addressdetails=1&countrycodes=gt,mx,sv,hn,ni,cr,pa,co,es,us`,
        {
          headers: {
            'Accept-Language': 'es',
          },
        }
      );
      const data = await res.json();
      setResults(
        data.map((item) => ({
          id: item.place_id,
          name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: item.type,
          importance: item.importance,
        }))
      );
      setIsOpen(true);
    } catch (err) {
      console.warn('Error buscando dirección:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchAddress(val), 350);
  };

  const handleSelectLocation = (coords, fullName) => {
    const short = fullName.split(',').slice(0, 2).join(', ');
    setQuery('');
    setIsOpen(false);
    setResults([]);
    if (searchTarget === 'destination') {
      onSelectDestination(coords, fullName);
      speakAssistant(`Nuevo destino seleccionado: ${short}.`);
    } else {
      onSelectOrigin(coords, fullName);
      speakAssistant(`Nuevo punto de partida seleccionado: ${short}.`);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col gap-2.5">
      {/* Target Toggle: Destino vs Origen */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/10 border border-white/15">
        <button
          onClick={() => {
            setSearchTarget('destination');
            setQuery('');
            setIsOpen(false);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${
            searchTarget === 'destination'
              ? 'bg-[#D84420] text-white shadow-sm'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Home size={13} />
          <span>Cambiar Destino (Casa)</span>
        </button>
        <button
          onClick={() => {
            setSearchTarget('origin');
            setQuery('');
            setIsOpen(false);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${
            searchTarget === 'origin'
              ? 'bg-[#0B5D3B] text-white shadow-sm border border-[#D4962A]/40'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <LocateFixed size={13} className="text-[#D4962A]" />
          <span>Cambiar Punto de Partida</span>
        </button>
      </div>

      {/* Input bar */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-[#D4962A]">
          <Search size={16} strokeWidth={2.5} />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={
            searchTarget === 'destination'
              ? 'Escribe la dirección o lugar al que deseas ir...'
              : 'Escribe tu punto de salida o dirección actual...'
          }
          className="w-full pl-10 pr-10 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-xs font-semibold placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#D4962A]/50 focus:border-[#D4962A]/60 transition-all"
        />
        {isSearching && (
          <div className="absolute right-3">
            <div className="w-4 h-4 border-2 border-[#D4962A] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {query && !isSearching && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 text-white/50 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Quick GPS button if in Origin mode */}
      {searchTarget === 'origin' && (
        <button
          onClick={onUseCurrentGPS}
          className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-[#10B981]/20 hover:bg-[#10B981]/30 border border-[#10B981]/40 text-[#10B981] text-[11px] font-black transition-all"
        >
          <Signal size={13} className={isTracking ? 'animate-pulse' : ''} />
          <span>{isTracking ? '📡 GPS Activo — Volver a centrar en mi ubicación' : '📍 Usar mi GPS real en vivo ahora'}</span>
        </button>
      )}

      {/* Popular Guatemala Zone Presets Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        <span className="text-[10px] font-black text-[#D4962A] uppercase shrink-0">Zonas sugeridas:</span>
        {GUATEMALA_PRESETS.map((preset) => (
          <button
            key={preset.short}
            onClick={() => handleSelectLocation({ lat: preset.lat, lng: preset.lng }, preset.name)}
            className="shrink-0 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-[10px] font-bold border border-white/10 transition-colors"
          >
            {preset.short}
          </button>
        ))}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0F172A]/98 backdrop-blur-xl border border-[#D4962A]/30 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[260px] overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelectLocation({ lat: result.lat, lng: result.lng }, result.name)}
              className="w-full text-left px-3 py-2.5 hover:bg-[#0B5D3B]/40 transition-colors border-b border-white/5 last:border-b-0 group"
            >
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                  searchTarget === 'destination'
                    ? 'bg-gradient-to-br from-[#D84420]/80 to-[#D4962A]/80'
                    : 'bg-gradient-to-br from-[#0B5D3B]/80 to-[#10B981]/80'
                }`}>
                  {searchTarget === 'destination' ? (
                    <Home size={14} className="text-white" />
                  ) : (
                    <LocateFixed size={14} className="text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {result.name.split(',').slice(0, 2).join(', ')}
                  </p>
                  <p className="text-[10px] text-white/50 truncate mt-0.5">
                    {result.name.split(',').slice(2).join(', ').trim()}
                  </p>
                </div>
                <ChevronRight size={12} className="text-white/30 mt-1.5 shrink-0 group-hover:text-[#D4962A] transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// CUSTOM MAP CONTROLS — Premium floating UI
// ==========================================
function CustomMapControls({
  onZoomIn,
  onZoomOut,
  onFocusOrigin,
  onFocusDestination,
  onRecenterRoute,
  onGetCurrentGPS,
  gpsLoading,
  isTracking,
}) {
  return (
    <div className="absolute right-4 top-44 z-20 flex flex-col gap-1.5">
      {/* Zoom Controls Group */}
      <div className="flex flex-col bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-black/5 overflow-hidden">
        <button
          onClick={onZoomIn}
          className="w-11 h-11 text-[#3B2118] font-black flex items-center justify-center hover:bg-[#FBF3E8] transition-colors active:scale-95"
          title="Acercar mapa (+)"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
        <div className="h-px bg-black/10 mx-2" />
        <button
          onClick={onZoomOut}
          className="w-11 h-11 text-[#3B2118] font-black flex items-center justify-center hover:bg-[#FBF3E8] transition-colors active:scale-95"
          title="Alejar mapa (-)"
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Location Controls Group */}
      <div className="flex flex-col bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-black/5 overflow-hidden mt-1">
        <button
          onClick={onFocusOrigin}
          className="w-11 h-11 flex items-center justify-center hover:bg-[#0B5D3B]/10 transition-colors active:scale-95"
          title="¿Dónde estoy? (Mi ubicación)"
        >
          <LocateFixed size={18} strokeWidth={2.5} className="text-[#0B5D3B]" />
        </button>
        <div className="h-px bg-black/10 mx-2" />
        <button
          onClick={onFocusDestination}
          className="w-11 h-11 flex items-center justify-center hover:bg-[#D84420]/10 transition-colors active:scale-95"
          title="¿Hacia dónde voy? (La casa)"
        >
          <MapPin size={18} strokeWidth={2.5} className="text-[#D84420]" />
        </button>
        <div className="h-px bg-black/10 mx-2" />
        <button
          onClick={onRecenterRoute}
          className="w-11 h-11 flex items-center justify-center hover:bg-[#3B2118]/10 transition-colors active:scale-95"
          title="Ver ruta completa"
        >
          <Compass size={18} strokeWidth={2.5} className="text-[#3B2118]" />
        </button>
      </div>

      {/* GPS Live Tracker */}
      <button
        onClick={onGetCurrentGPS}
        disabled={gpsLoading}
        className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-95 mt-1 ${
          gpsLoading
            ? 'bg-[#D4962A] text-white animate-pulse shadow-[0_0_20px_rgba(212,150,42,0.5)]'
            : isTracking
            ? 'bg-[#10B981] text-white shadow-[0_0_16px_rgba(16,185,129,0.4)] border-2 border-white/40'
            : 'bg-white/95 text-[#0B5D3B] border border-black/5 hover:bg-[#0B5D3B]/10'
        }`}
        title={isTracking ? 'GPS en vivo activo — Toca para centrar' : 'Obtener mi GPS real en vivo'}
      >
        {isTracking ? (
          <Signal size={18} strokeWidth={2.5} />
        ) : (
          <Crosshair size={18} strokeWidth={2.5} />
        )}
      </button>
    </div>
  );
}

// ==========================================
// MAIN RUWAJAY NAVIGATION COMPONENT
// ==========================================
export default function RuwaJayNavigationView({
  origin,
  destination,
  propertyTitle = 'Propiedad RuwaJay',
  propertyAddress = 'Guatemala',
  propertyPrice = null,
  propertyThumbnail = null,
  mode = 'driving', // 'driving' | 'walking'
  onRouteChange = null,
}) {
  const [liveOrigin, setLiveOrigin] = useState(() => origin || { lat: 14.6349, lng: -90.5069 });
  const [liveDestination, setLiveDestination] = useState(() => destination || { lat: 14.595, lng: -90.485 });
  const [customOriginName, setCustomOriginName] = useState('');
  const [customDestName, setCustomDestName] = useState('');
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1);
  const [followVehicle, setFollowVehicle] = useState(false);
  const [mapTheme, setMapTheme] = useState('calles'); // 'calles' | 'relieve' | 'satelite'
  const [showStepDrawer, setShowStepDrawer] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState(null);
  const [targetFocus, setTargetFocus] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [trafficRefreshTick, setTrafficRefreshTick] = useState(0);

  // Voice Assistant Settings
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceDialect, setVoiceDialect] = useState('dalia'); // 'dalia' | 'latino' | 'espana' | 'auto'
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [showSubtitle, setShowSubtitle] = useState(false);
  const subtitleTimeoutRef = useRef(null);
  const lastSpokenStepRef = useRef(-1);

  const mapInstanceRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const bestGpsAccuracyRef = useRef(Infinity);
  const lastGpsPositionRef = useRef(null);
  const lastGpsUpdateRef = useRef(0);
  const lastRouteAlertRef = useRef('');

  const originLat = liveOrigin?.lat ?? 14.6349;
  const originLng = liveOrigin?.lng ?? -90.5069;
  const destLat = liveDestination?.lat ?? 14.595;
  const destLng = liveDestination?.lng ?? -90.485;

  // Refresh live traffic estimates without requiring the user to reload.
  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN || mode !== 'driving') return undefined;
    const timer = setInterval(() => setTrafficRefreshTick((tick) => tick + 1), 120000);
    return () => clearInterval(timer);
  }, [mode]);

  const displayDestName = customDestName || propertyAddress;

  // Sync origin prop with liveOrigin when GPS is not actively overriding
  useEffect(() => {
    if (origin?.lat && origin?.lng && !isTracking) {
      setLiveOrigin(origin);
    }
  }, [origin?.lat, origin?.lng, isTracking]);

  // Update destination when prop changes
  useEffect(() => {
    if (destination?.lat && destination?.lng) {
      setLiveDestination(destination);
    }
  }, [destination]);

  // Load and cache Spanish voices asynchronously
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const vList = window.speechSynthesis.getVoices() || [];
        if (vList.length > 0) {
          setAvailableVoices(vList);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      // Some browsers delay populating getVoices(); check briefly
      const pollTimer = setInterval(() => {
        const vList = window.speechSynthesis.getVoices() || [];
        if (vList.length > 0) {
          setAvailableVoices(vList);
          clearInterval(pollTimer);
        }
      }, 150);

      return () => {
        clearInterval(pollTimer);
        if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Locate the real Microsoft Dalia voice exposed by the browser.
  const findDaliaVoice = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const browserVoices = window.speechSynthesis.getVoices() || [];
    const all = browserVoices.length > 0 ? browserVoices : availableVoices;

    return all.find((voice) => {
      const name = voice.name?.toLowerCase() || '';
      const lang = voice.lang?.toLowerCase().replace('_', '-') || '';
      return name.includes('dalia') && (lang === 'es-mx' || /spanish.*mexico|mexico.*spanish/.test(name));
    }) || null;
  }, [availableVoices]);

  // Fallback: find the best available Spanish voice (Dalia > es-MX > es-*)
  const findBestSpanishVoice = useCallback(() => {
    // 1. Try Dalia first
    const dalia = findDaliaVoice();
    if (dalia) return dalia;

    // 2. Gather all voices
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const browserVoices = window.speechSynthesis.getVoices() || [];
    const all = browserVoices.length > 0 ? browserVoices : availableVoices;

    // 3. Try es-MX voices (Mexican Spanish)
    const esMX = all.find((v) => {
      const lang = v.lang?.toLowerCase().replace('_', '-') || '';
      return lang === 'es-mx';
    });
    if (esMX) return esMX;

    // 4. Try any es-* Spanish voice
    const esAny = all.find((v) => {
      const lang = v.lang?.toLowerCase().replace('_', '-') || '';
      return lang.startsWith('es');
    });
    if (esAny) return esAny;

    return null;
  }, [findDaliaVoice, availableVoices]);

  const detectedDaliaVoice = useMemo(() => findDaliaVoice(), [findDaliaVoice, availableVoices]);
  const activeSpanishVoice = useMemo(() => findBestSpanishVoice(), [findBestSpanishVoice, availableVoices]);

  // Voice Assistant: uses Dalia when available, falls back to any Spanish voice
  const speakAssistant = useCallback((text) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!text) return;

    // Always display the true navigation instruction in the subtitle banner immediately
    setLastSpokenText(text);
    setShowSubtitle(true);
    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
    subtitleTimeoutRef.current = setTimeout(() => setShowSubtitle(false), 6500);

    const performSpeech = () => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-MX'; // Mexican Spanish preferred

        // Try Dalia first, then any Spanish voice
        const voice = findBestSpanishVoice();
        if (!voice) {
          // No Spanish voice at all – still show text but don't block
          setIsSpeaking(false);
          setLastSpokenText(text);
          setShowSubtitle(true);
          console.warn('No se encontró ninguna voz en español en el navegador.');
          return;
        }

        utterance.voice = voice;
        utterance.lang = voice.lang || 'es-MX';

        // Natural cadence
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        // Small tick to prevent Chromium cancellation bug
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('Speech error:', e);
          }
        }, 35);
      } catch (err) {
        console.warn('Error en asistente de voz:', err);
      }
    };

    const currentList = window.speechSynthesis.getVoices() || [];
    if (currentList.length > 0) {
      performSpeech();
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', performSpeech, { once: true });
      setTimeout(performSpeech, 120);
    }
  }, [voiceEnabled, findBestSpanishVoice]);

  // 1. Fetch real street route from multi-provider OSRM (with alternatives & shortest route sorting)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    // Do not keep showing metrics that belong to the previous origin.
    setAvailableRoutes([]);
    setSelectedRouteIndex(0);

    const fetchOptimalRoutes = async () => {
      const routerProfile = mode === 'walking' ? 'foot' : 'car';
      const osrmProfile = mode === 'walking' ? 'walking' : 'driving';
      const endpoints = [];
      if (MAPBOX_ACCESS_TOKEN) {
        const mapboxProfile = mode === 'walking' ? 'mapbox/walking' : 'mapbox/driving-traffic';
        endpoints.push({
          provider: mode === 'driving' ? 'mapbox-traffic' : 'mapbox',
          url: `https://api.mapbox.com/directions/v5/${mapboxProfile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&alternatives=true&language=es&annotations=duration,distance${mode === 'driving' ? ',congestion,congestion_numeric,closure' : ''}&access_token=${encodeURIComponent(MAPBOX_ACCESS_TOKEN)}`,
        });
      }
      endpoints.push(
        { provider: 'osrm', url: `https://router.project-osrm.org/route/v1/${osrmProfile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&alternatives=true` },
        { provider: 'osrm', url: `https://routing.openstreetmap.de/routed-${routerProfile}/route/v1/${osrmProfile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&alternatives=true` },
      );

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint.url);
          if (!res.ok) continue;
          const data = await res.json();

          if (isMounted && data.routes && data.routes.length > 0) {
            // Sort all real street routes by shortest distance in meters
            const parsedRoutes = data.routes
              .map((r, i) => {
                const rawCoords = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                const legSteps = r.legs?.[0]?.steps || [];
                const leg = r.legs?.[0];
                const summary = leg?.summary || (i === 0 ? 'Vía principal recomendada' : 'Vía alternativa');
                const incidents = leg?.incidents || [];
                const closures = leg?.closures || [];
                const congestionValues = (leg?.annotation?.congestion_numeric || []).filter(Number.isFinite);
                const averageCongestion = congestionValues.length
                  ? Math.round(congestionValues.reduce((sum, value) => sum + value, 0) / congestionValues.length)
                  : null;

                const maneuvers = legSteps.map((step, idx) => {
                  const mType = step.maneuver?.type;
                  const modifier = step.maneuver?.modifier;
                  const streetName = step.name ? step.name.trim() : '';

                  let icon = 'straight';
                  if (modifier?.includes('left')) icon = 'left';
                  else if (modifier?.includes('right')) icon = 'right';
                  else if (mType === 'roundabout') icon = 'roundabout';
                  else if (idx === legSteps.length - 1) icon = 'destination';

                  let instruction = '';
                  if (idx === legSteps.length - 1) {
                    instruction = `Llegada a tu destino: ${streetName || displayDestName}`;
                  } else if (idx === 0) {
                    instruction = streetName ? `Inicia tu recorrido por ${streetName}` : 'Inicia tu recorrido hacia la vía principal';
                  } else if (mType === 'turn' || mType === 'fork') {
                    const dir = modifier === 'left' ? 'la izquierda' : modifier === 'right' ? 'la derecha' : 'adelante';
                    instruction = streetName ? `Gira a ${dir} en ${streetName}` : `Gira a ${dir}`;
                  } else if (mType === 'roundabout') {
                    instruction = streetName ? `En la rotonda, toma la salida hacia ${streetName}` : 'En la rotonda, toma la salida señalada';
                  } else {
                    instruction = streetName ? `Avanza por ${streetName}` : 'Continúa recto por la calzada';
                  }

                  return {
                    instruction,
                    streetName: streetName || 'Vía conectora',
                    distance: step.distance,
                    duration: step.duration,
                    location: [step.maneuver?.location?.[1] || rawCoords[0][0], step.maneuver?.location?.[0] || rawCoords[0][1]],
                    icon,
                  };
                });

                return {
                  id: `route-${i}`,
                  title: i === 0 ? 'Ruta recomendada' : `Ruta alternativa ${i}`,
                  summary,
                  coords: rawCoords,
                  distanceMeters: r.distance,
                  durationSeconds: r.duration,
                  typicalDurationSeconds: r.duration_typical || null,
                  trafficDelaySeconds: r.duration_typical ? Math.max(0, r.duration - r.duration_typical) : 0,
                  trafficAware: endpoint.provider === 'mapbox-traffic',
                  incidents,
                  closures,
                  averageCongestion,
                  updatedAt: new Date().toISOString(),
                  steps: maneuvers,
                };
              })
              .sort((a, b) => {
                const safetyPenalty = (route) =>
                  (route.closures?.length || 0) * 86400 +
                  (route.incidents?.length || 0) * 1800 +
                  (route.averageCongestion || 0) * 8;
                // Siempre elegir el mejor tiempo estimado; cuando hay datos
                // en vivo, cierres e incidencias tienen prioridad absoluta.
                return (a.durationSeconds + safetyPenalty(a)) -
                  (b.durationSeconds + safetyPenalty(b));
              });

            // Set shortest route as primary
            setAvailableRoutes(parsedRoutes);
            setSelectedRouteIndex(0);
            return;
          }
        } catch (err) {
          console.warn('Endpoint error, intentando respaldo...', err);
        }
      }
    };

    fetchOptimalRoutes().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [originLat, originLng, destLat, destLng, mode, displayDestName, trafficRefreshTick]);

  // Current active route data (defaults to the shortest road path)
  const currentRoute = availableRoutes[selectedRouteIndex] || availableRoutes[0] || null;
  const routeCoordinates = currentRoute?.coords || [];
  const steps = currentRoute?.steps || [];
  const totalDistanceMeters = currentRoute?.distanceMeters || 0;
  const totalDurationSeconds = currentRoute?.durationSeconds || 0;
  const routeSummary = currentRoute?.summary || 'Calles principales de la ciudad';

  // Alternative route (for map overlay)
  const alternativeRoute = availableRoutes.length > 1 ? availableRoutes[selectedRouteIndex === 0 ? 1 : 0] : null;

  // Notify parent component of current route metrics
  useEffect(() => {
    if (currentRoute && typeof onRouteChange === 'function') {
      onRouteChange({
        origin: liveOrigin,
        originName: customOriginName || (isTracking ? 'Tu Ubicación GPS en Vivo' : 'Tu Ubicación'),
        destination: liveDestination,
        customDestName: customDestName || propertyTitle,
        customDestAddress: customDestName || propertyAddress,
        distanceKm: (totalDistanceMeters / 1000).toFixed(1),
        durationMins: Math.max(3, Math.round(totalDurationSeconds / 60)),
        routeSummary,
        trafficAware: currentRoute.trafficAware,
        trafficDelayMins: Math.round((currentRoute.trafficDelaySeconds || 0) / 60),
        incidents: currentRoute.incidents || [],
        closures: currentRoute.closures || [],
        updatedAt: currentRoute.updatedAt,
      });
    }
  }, [currentRoute, totalDistanceMeters, totalDurationSeconds, routeSummary, liveOrigin, liveDestination, customDestName, customOriginName, propertyTitle, propertyAddress, isTracking, onRouteChange]);

  // Welcome speech greeting on initial route calculation
  useEffect(() => {
    if (totalDistanceMeters > 0) {
      const distKm = (totalDistanceMeters / 1000).toFixed(1);
      const mins = Math.max(3, Math.round(totalDurationSeconds / 60));
      const firstStreet = steps[0]?.streetName || 'la calle principal';
      speakAssistant(
        `Ruta más corta calculada. Distancia: ${distKm} kilómetros, tiempo estimado: ${mins} minutos. Comienza por ${firstStreet}.`
      );
    }
  }, [totalDistanceMeters, selectedRouteIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulation loop
  useEffect(() => {
    if (simulating && routeCoordinates.length > 0) {
      const intervalMs = Math.max(70, Math.floor(320 / simSpeed));
      animRef.current = setInterval(() => {
        setSimIndex((prev) => {
          if (prev >= routeCoordinates.length - 1) {
            setSimulating(false);
            speakAssistant(`Has llegado a tu destino: ${displayDestName}.`);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [simulating, routeCoordinates.length, simSpeed, displayDestName, speakAssistant]);

  // Voice guidance triggered as vehicle reaches turn points
  useEffect(() => {
    if (!simulating || steps.length === 0 || routeCoordinates.length === 0) return;
    const progress = simIndex / (routeCoordinates.length - 1);
    const stepIdx = Math.min(steps.length - 1, Math.floor(progress * steps.length));

    if (stepIdx !== lastSpokenStepRef.current && steps[stepIdx]) {
      lastSpokenStepRef.current = stepIdx;
      speakAssistant(steps[stepIdx].instruction);
    }
  }, [simIndex, simulating, steps, routeCoordinates.length, speakAssistant]);

  const currentVehiclePos = routeCoordinates[simIndex] || [originLat, originLng];
  const nextPos = routeCoordinates[Math.min(simIndex + 1, routeCoordinates.length - 1)] || currentVehiclePos;
  const currentBearing = calculateBearing(
    currentVehiclePos[0], currentVehiclePos[1],
    nextPos[0], nextPos[1]
  );

  const distanceKm = (totalDistanceMeters / 1000).toFixed(1);
  const durationMins = Math.max(3, Math.round(totalDurationSeconds / 60));
  const trafficDelayMins = Math.round((currentRoute?.trafficDelaySeconds || 0) / 60);
  const trafficIssueCount = (currentRoute?.incidents?.length || 0) + (currentRoute?.closures?.length || 0);
  const routeAlert = currentRoute?.closures?.length
    ? { level: 'danger', text: `Se detectaron ${currentRoute.closures.length} cierre(s) en la ruta. Se priorizó una alternativa sin bloqueo cuando estuvo disponible.` }
    : currentRoute?.incidents?.length
      ? { level: 'danger', text: `Hay ${currentRoute.incidents.length} incidente(s) reportado(s). Conduce con precaución y sigue los desvíos indicados.` }
      : trafficDelayMins >= 5 || (currentRoute?.averageCongestion || 0) >= 60
        ? { level: 'warning', text: `Tráfico fuerte detectado: demora aproximada de ${Math.max(trafficDelayMins, 1)} minuto(s). La ruta seleccionada ofrece el mejor tiempo disponible.` }
        : currentRoute?.trafficAware
          ? null
          : { level: 'info', text: 'No hay cobertura de tráfico en vivo. La ruta se calcula con calles disponibles y tiempo estimado, sin incidentes en tiempo real.' };

  useEffect(() => {
    if (!routeAlert || routeAlert.level === 'info' || routeAlert.text === lastRouteAlertRef.current) return;
    lastRouteAlertRef.current = routeAlert.text;
    speakAssistant(`Alerta de ruta. ${routeAlert.text}`);
  }, [routeAlert?.level, routeAlert?.text, speakAssistant]);
  const progressPercent = routeCoordinates.length > 1
    ? Math.round((simIndex / (routeCoordinates.length - 1)) * 100)
    : 0;

  const currentNextStep = steps[0] || {
    instruction: `Avanza directo hacia ${displayDestName || 'tu destino'}`,
    streetName: 'Vía principal',
    distance: 250,
    icon: 'straight'
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullScreen(false);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };
  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // Focus: Where the person is
  const handleFocusOrigin = () => {
    setFollowVehicle(false);
    setTargetFocus([originLat, originLng]);
    speakAssistant('Mostrando tu ubicación actual.');
  };

  // Focus: Where the house is
  const handleFocusDestination = () => {
    setFollowVehicle(false);
    setTargetFocus([destLat, destLng]);
    speakAssistant(`Mostrando la ubicación de destino: ${displayDestName}.`);
  };

  // Focus: View entire route
  const handleRecenterRoute = () => {
    setFollowVehicle(false);
    setTargetFocus(null);
    speakAssistant('Mostrando la ruta completa.');
    if (mapInstanceRef.current && routeCoordinates.length > 0) {
      const allPoints = [...routeCoordinates, [originLat, originLng], [destLat, destLng]];
      const b = L.latLngBounds(allPoints);
      mapInstanceRef.current.fitBounds(b, {
        paddingTopLeft: [50, 140],
        paddingBottomRight: [50, 160],
        maxZoom: 15,
        animate: true,
      });
    }
  };

  // Real GPS hardware sync — Continuous tracking mode
  const handleGetCurrentGPS = () => {
    if (!navigator.geolocation) {
      speakAssistant('Tu navegador no permite acceso al sensor GPS.');
      return;
    }

    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }

    setGpsLoading(true);
    bestGpsAccuracyRef.current = Infinity;
    lastGpsPositionRef.current = null;
    lastGpsUpdateRef.current = 0;
    speakAssistant(isTracking
      ? 'Actualizando tu ubicación GPS y recalculando la ruta.'
      : 'Activando rastreo GPS en tiempo real. Esperando una señal precisa.');

    const acceptGpsPosition = (pos) => {
      const accuracy = Number(pos.coords.accuracy) || Infinity;
      // Reject only readings that are dramatically worse. A moving user's
      // newest position must still be accepted even if its accuracy varies.
      if (Number.isFinite(bestGpsAccuracyRef.current) && accuracy > Math.max(250, bestGpsAccuracyRef.current * 4)) return;

      bestGpsAccuracyRef.current = Math.min(bestGpsAccuracyRef.current, accuracy);
      const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const previous = lastGpsPositionRef.current;
      const movedMeters = previous
        ? L.latLng(previous.lat, previous.lng).distanceTo(L.latLng(newCoords.lat, newCoords.lng))
        : Infinity;
      const elapsed = Date.now() - lastGpsUpdateRef.current;
      // Avoid recalculating for harmless GPS jitter, but force a periodic
      // refresh so traffic/time never remains stale.
      if (previous && movedMeters < Math.max(8, Math.min(accuracy, 30)) && elapsed < 15000) return;

      lastGpsPositionRef.current = newCoords;
      lastGpsUpdateRef.current = Date.now();
      setGpsAccuracy(Number.isFinite(accuracy) ? Math.round(accuracy) : null);
      setGpsLoading(false);
      setIsTracking(true);
      setCustomOriginName('Tu ubicación GPS');
      setLiveOrigin(newCoords);
      setTargetFocus([newCoords.lat, newCoords.lng]);
    };

    // Ask for a fresh high-accuracy fix before starting continuous updates.
    navigator.geolocation.getCurrentPosition(acceptGpsPosition, () => {}, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    // Start continuous GPS tracking
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      acceptGpsPosition,
      (err) => {
        setGpsLoading(false);
        if (!lastGpsPositionRef.current) {
          setIsTracking(false);
          speakAssistant('No se pudo obtener una ubicación GPS nueva. Revisa el permiso de ubicación del navegador.');
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

  // Handle new destination from search
  const handleNewDestination = (coords, name) => {
    setLiveDestination(coords);
    setCustomDestName(name.split(',').slice(0, 2).join(', '));
    setSimIndex(0);
    setSimulating(false);
    setSelectedRouteIndex(0);
    setShowSearchPanel(false);
    setTargetFocus(null);
  };

  // Handle new origin from search
  const handleNewOrigin = (coords, name) => {
    // If setting custom origin, stop live GPS watch so it doesn't overwrite immediately
    if (gpsWatchRef.current) {
      navigator.geolocation?.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    setIsTracking(false);
    setGpsAccuracy(null);
    lastGpsPositionRef.current = null;
    lastGpsUpdateRef.current = 0;
    setLiveOrigin(coords);
    setCustomOriginName(name.split(',').slice(0, 2).join(', '));
    setSimIndex(0);
    setSimulating(false);
    setSelectedRouteIndex(0);
    setShowSearchPanel(false);
    setTargetFocus(null);
  };

  // Public tile providers. CARTO was removed because it returns
  // "API KEY REQUIRED" for this project.
  const activeTileLayer = useMemo(() => {
    if (mapTheme === 'satelite') return {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
      maxNativeZoom: 19,
      maxZoom: 20,
    };
    if (mapTheme === 'relieve') return {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap',
      maxNativeZoom: 17,
      maxZoom: 19,
    };
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      maxNativeZoom: 19,
      maxZoom: 20,
    };
  }, [mapTheme]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[550px] overflow-hidden rounded-[28px] bg-[#F7F0E6] select-none ring-1 ring-[#3B2118]/15"
      style={{ boxShadow: '0 24px 70px rgba(59,33,24,.16), 0 3px 12px rgba(59,33,24,.08)' }}
    >
      {/* ── TOP RUWAJAY PREMIUM NAVIGATION HUD ── */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        
        {/* Glassmorphism Top Bar */}
        <div className="pointer-events-auto m-3 flex flex-col gap-2.5">
          
          {/* Main Instruction Bar — Premium glassmorphism */}
          <div
            className="flex items-center justify-between gap-3 p-3 sm:px-4 sm:py-3.5 rounded-[20px]"
            style={{
              background: 'rgba(11, 93, 59, .96)',
              backdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,245,232,.22)',
              boxShadow: '0 10px 28px rgba(22,52,39,.2), inset 0 1px 0 rgba(255,255,255,.12)',
            }}
          >
            {/* Next Maneuver Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center shrink-0"
                style={{
                  background: '#D84420',
                  boxShadow: '0 6px 16px rgba(216,68,32,.32)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                }}
              >
                {currentNextStep.icon === 'left' ? (
                  <CornerDownLeft size={24} strokeWidth={2.8} className="text-white" />
                ) : currentNextStep.icon === 'right' ? (
                  <CornerDownRight size={24} strokeWidth={2.8} className="text-white" />
                ) : currentNextStep.icon === 'destination' ? (
                  <Flag size={24} strokeWidth={2.8} className="text-white" />
                ) : (
                  <ArrowUp size={24} strokeWidth={2.8} className="text-white" />
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#D4962A]">
                    Próxima maniobra · {Math.round(currentNextStep.distance || 180)}m
                  </span>
                  {isTracking && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#10B981]/25 px-2 py-0.5 rounded-full text-[#10B981] border border-[#10B981]/30">
                      <Signal size={9} className="animate-pulse" /> GPS Activo
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-white truncate max-w-xs sm:max-w-md mt-0.5">
                  {currentNextStep.instruction}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              
              {/* Search / Change Route Button */}
              <button
                onClick={() => setShowSearchPanel(!showSearchPanel)}
                className={`flex items-center gap-1 px-2.5 py-2 rounded-xl transition-all border text-xs font-black ${
                  showSearchPanel
                    ? 'bg-[#D4962A] text-[#3B2118] border-[#D4962A] shadow-lg'
                    : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
                }`}
                title="Buscar dirección o cambiar ruta"
              >
                <Search size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline">Buscar / Ruta</span>
              </button>

              {/* Spanish Voice Assistant Toggle Group */}
              <div className="flex items-center rounded-xl bg-white/10 border border-white/15 overflow-hidden">
                <button
                  onClick={() => {
                    const nextState = !voiceEnabled;
                    setVoiceEnabled(nextState);
                    if (nextState) {
                      speakAssistant('Asistente de voz RuwaJay activado.');
                    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-black transition-all ${
                    voiceEnabled
                      ? 'bg-[#D4962A] text-[#3B2118] shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title={
                    voiceEnabled
                      ? `Desactivar voz de asistente (${activeSpanishVoice?.name || 'Español'})`
                      : 'Activar voz en español'
                  }
                >
                  {voiceEnabled ? (
                    <>
                      {isSpeaking ? (
                        <div className="flex items-end gap-0.5 h-3.5">
                          <span className="w-0.5 bg-[#3B2118] rounded-full ruwa-wave-bar-1" />
                          <span className="w-0.5 bg-[#3B2118] rounded-full ruwa-wave-bar-2" />
                          <span className="w-0.5 bg-[#3B2118] rounded-full ruwa-wave-bar-3" />
                          <span className="w-0.5 bg-[#3B2118] rounded-full ruwa-wave-bar-4" />
                        </div>
                      ) : (
                        <Volume2 size={15} />
                      )}
                      <span className="hidden md:inline">
                        {detectedDaliaVoice ? 'Dalia' : activeSpanishVoice ? 'Voz' : 'Voz'}
                      </span>
                    </>
                  ) : (
                    <>
                      <VolumeX size={15} />
                      <span className="hidden md:inline">Mute</span>
                    </>
                  )}
                </button>

                {/* Voice Dialect & Audio Settings */}
                <button
                  onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                  className={`p-2 transition-colors border-l border-white/15 ${
                    showVoiceMenu ? 'bg-[#D4962A]/40 text-[#D4962A]' : 'text-white/70 hover:text-white'
                  }`}
                  title="Configurar acento del asistente (Latino / España)"
                >
                  <SlidersHorizontal size={13} />
                </button>
              </div>

              {/* Tile Mode Tabs — Premium glass tabs */}
              <div
                className="flex items-center rounded-xl p-0.5"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <button
                  onClick={() => setMapTheme('calles')}
                  className={`px-2.5 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                    mapTheme === 'calles'
                      ? 'bg-[#FFF5E8] text-[#0B5D3B] shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="Mapa de Calles"
                >
                  <MapIcon size={14} className="inline mr-0.5 -mt-0.5" />
                  <span className="hidden sm:inline"> Calles</span>
                </button>
                <button
                  onClick={() => setMapTheme('satelite')}
                  className={`px-2.5 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                    mapTheme === 'satelite'
                      ? 'bg-[#0B5D3B] text-white shadow-sm border border-[#D4962A]/60'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="Vista Satelital"
                >
                  <Satellite size={14} className="inline mr-0.5 -mt-0.5" />
                  <span className="hidden sm:inline"> Satélite</span>
                </button>
                <button
                  onClick={() => setMapTheme('relieve')}
                  className={`px-2.5 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                    mapTheme === 'relieve'
                      ? 'bg-[#D84420] text-white shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="Mapa de relieve y curvas de nivel"
                >
                  <Pencil size={14} className="inline mr-0.5 -mt-0.5" />
                  <span className="hidden sm:inline"> Relieve</span>
                </button>
              </div>

              {/* Step list drawer button */}
              <button
                onClick={() => setShowStepDrawer(!showStepDrawer)}
                className={`hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  showStepDrawer
                    ? 'bg-[#D84420] text-white border-[#D84420]'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                }`}
                title="Ver lista de pasos"
              >
                <Layers size={14} />
                <span>{steps.length}</span>
              </button>

              {/* Fullscreen button */}
              <button
                onClick={handleToggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                title={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Voice Settings Popover - Exclusively Microsoft Dalia (Spanish) */}
          {showVoiceMenu && (
            <div
              className="p-4 sm:p-5 rounded-[22px] pointer-events-auto w-full max-w-[420px] ml-auto text-[#3B2118]"
              style={{
                background: 'rgba(255, 250, 242, .98)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(59,33,24,.12)',
                boxShadow: '0 22px 60px rgba(59,33,24,.22), 0 2px 8px rgba(59,33,24,.08)',
                animation: 'slideDown 0.2s ease-out',
              }}
            >
              <div className="flex items-start justify-between gap-4 pb-3 mb-3 border-b border-[#3B2118]/10">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0B5D3B] text-[#FFF5E8] shadow-sm">
                    <Volume2 size={18} />
                  </span>
                  <div>
                    <span className="block text-[10px] font-black tracking-[.16em] text-[#D84420] uppercase">Navegación por voz</span>
                    <span className="block text-sm font-black text-[#3B2118]">Asistente de Voz en Español</span>
                  </div>
                </div>
                <button onClick={() => setShowVoiceMenu(false)} className="grid h-8 w-8 place-items-center rounded-full bg-[#3B2118]/5 text-[#3B2118]/55 hover:bg-[#3B2118]/10 hover:text-[#3B2118] transition-colors" aria-label="Cerrar configuración de voz">
                  <X size={15} />
                </button>
              </div>

              <p className="text-xs leading-relaxed text-[#6F5A50] mb-3 font-medium">
                Revisa la voz detectada por tu navegador y escucha una prueba antes de iniciar el recorrido.
              </p>

              {/* Voice card: shows Dalia if available, otherwise the active Spanish fallback */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E8D9C8] shadow-[0_6px_20px_rgba(59,33,24,.07)] mb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF0DA] text-[#D84420] flex items-center justify-center shrink-0">
                      <Mic size={18} />
                    </div>
                    <div>
                      <span className="block font-black text-xs text-[#3B2118] line-clamp-1">
                        {activeSpanishVoice ? activeSpanishVoice.name : 'Sin voz en español disponible'}
                      </span>
                      <span className="block text-[10px] text-[#7A685F] font-semibold mt-0.5">
                        {detectedDaliaVoice
                          ? `Microsoft Dalia · ${detectedDaliaVoice.lang}`
                          : activeSpanishVoice
                            ? `Voz del navegador · ${activeSpanishVoice.lang}`
                            : 'No se encontró ninguna voz en español en tu navegador'}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${
                    activeSpanishVoice
                      ? 'text-[#087A4B] bg-[#E8F7EF] border-[#BDE7CF]'
                      : 'text-[#A45E08] bg-[#FFF4D9] border-[#F2D18A]'
                  }`}>
                    {activeSpanishVoice ? <><Check size={10} /> Activa</> : <><AlertCircle size={10} /> No disponible</>}
                  </span>
                </div>
              </div>

              {/* Test Voice button */}
              <button
                onClick={() => {
                  speakAssistant('¡Hola! Soy tu asistente de voz en español de RuwaJay. Te guiaré paso a paso por la ruta más corta hacia tu vivienda.');
                }}
                className="w-full min-h-11 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#D84420] hover:bg-[#C93D1C] text-white text-xs font-black shadow-[0_7px_18px_rgba(216,68,32,.24)] transition-all active:scale-[.98]"
              >
                <Mic size={14} />
                <span>Escuchar prueba de voz</span>
              </button>
            </div>
          )}

          {/* Subtitle / Live Transcription Banner */}
          {showSubtitle && lastSpokenText && (
            <div
              className="pointer-events-auto flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl border text-[#3B2118]"
              style={{
                background: 'rgba(255,250,242,.97)',
                backdropFilter: 'blur(18px)',
                borderColor: 'rgba(59,33,24,.12)',
                boxShadow: '0 10px 30px rgba(59,33,24,.16)',
                animation: 'slideDown 0.2s ease-out',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Animated equalizer waves */}
                <div className="flex items-end gap-0.5 h-3.5 shrink-0">
                  <span className="w-1 bg-[#D4962A] rounded-full ruwa-wave-bar-1" />
                  <span className="w-1 bg-[#10B981] rounded-full ruwa-wave-bar-2" />
                  <span className="w-1 bg-[#D4962A] rounded-full ruwa-wave-bar-3" />
                  <span className="w-1 bg-[#10B981] rounded-full ruwa-wave-bar-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D84420] shrink-0">
                  {detectedDaliaVoice ? 'Dalia' : 'Asistente'}
                </span>
                <p className="text-xs font-bold text-[#3B2118] truncate">
                  {lastSpokenText}
                </p>
              </div>
              <button
                onClick={() => setShowSubtitle(false)}
                className="text-[#3B2118]/35 hover:text-[#3B2118] transition-colors p-1"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Address Search Panel — Slide-in */}
          {showSearchPanel && (
            <div
              className="p-4 rounded-[22px] pointer-events-auto"
              style={{
                background: 'rgba(11, 79, 51, .97)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(212, 150, 42, 0.35)',
                boxShadow: '0 18px 45px rgba(27,51,40,.24)',
                animation: 'slideDown 0.25s ease-out',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Navigation2 size={15} className="text-[#D4962A]" />
                  <span className="text-[11px] font-black text-[#D4962A] uppercase tracking-wider">
                    Buscar Dirección · Cambiar Ruta en Vivo
                  </span>
                </div>
                <button
                  onClick={() => setShowSearchPanel(false)}
                  className="text-white/40 hover:text-white transition-colors p-1"
                >
                  <X size={14} />
                </button>
              </div>
              <AddressSearchBar
                onSelectDestination={handleNewDestination}
                onSelectOrigin={handleNewOrigin}
                speakAssistant={speakAssistant}
                currentDestAddress={displayDestName}
                currentOriginAddress={customOriginName || (isTracking ? 'Tu Ubicación GPS en Vivo' : 'Tu Ubicación')}
                onUseCurrentGPS={handleGetCurrentGPS}
                isTracking={isTracking}
              />
              <div className="flex items-center justify-between text-[10px] text-white/50 font-bold mt-2 pt-2 border-t border-white/10">
                <span>📍 Origen: <strong className="text-white/80">{customOriginName || (isTracking ? 'GPS en Vivo' : 'Ubicación actual')}</strong></span>
                <span>🏠 Destino: <strong className="text-white/80">{displayDestName}</strong></span>
              </div>
            </div>
          )}

          {/* Route Selector — Premium glassmorphism bar */}
          <div
            className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl text-[11px]"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.88) 100%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            {/* Route Options Badges */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase text-[#D4962A] flex items-center gap-1">
                <RouteIcon size={12} /> Rutas:
              </span>
              
              {availableRoutes.map((r, idx) => {
                const isShortest = idx === 0;
                const isSelected = selectedRouteIndex === idx;
                const distText = (r.distanceMeters / 1000).toFixed(1) + ' km';
                const timeText = Math.max(3, Math.round(r.durationSeconds / 60)) + ' min';

                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRouteIndex(idx);
                      setSimIndex(0);
                      setSimulating(false);
                      speakAssistant(`Cambiando a ${isShortest ? 'la ruta más corta' : 'ruta alternativa'} de ${distText}.`);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-[10px] transition-all border ${
                      isSelected
                        ? 'bg-[#10B981] text-slate-950 border-[#10B981] shadow-md shadow-[#10B981]/30'
                        : 'bg-white/10 text-white/80 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    <span>{isShortest ? (r.trafficAware ? '⚡ Rápida:' : '⭐ Corta:') : 'Alt:'}</span>
                    <span className="font-bold">{distText} ({timeText})</span>
                  </button>
                );
              })}
            </div>

            {/* Route summary */}
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                currentRoute?.trafficAware
                  ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-300/20'
                  : 'bg-amber-400/10 text-amber-200 border border-amber-300/20'
              }`}>
                <Radio size={11} className={currentRoute?.trafficAware ? 'animate-pulse' : ''} />
                {currentRoute?.trafficAware
                  ? `Tráfico en vivo${trafficIssueCount ? ` · ${trafficIssueCount} incidencia${trafficIssueCount === 1 ? '' : 's'}` : ''}`
                  : 'Estimación sin tráfico en vivo'}
              </span>
              <span className="text-white/70 truncate">
                Vía: <strong className="text-[#FFF5E8]">{routeSummary}</strong>
              </span>
            </div>
          </div>

          {routeAlert && (
            <div className={`flex items-start gap-2 border-y px-4 py-2.5 text-xs font-bold shadow-sm ${
              routeAlert.level === 'danger'
                ? 'border-red-300 bg-red-50 text-red-800'
                : routeAlert.level === 'warning'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-sky-300 bg-sky-50 text-sky-800'
            }`}>
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{routeAlert.text}</span>
            </div>
          )}

          {/* Progress Bar during simulation */}
          {simulating && (
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{
                background: 'rgba(11, 93, 59, 0.3)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #10B981 0%, #D4962A 50%, #D84420 100%)',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── MAP CONTAINER OR VECTOR BLUEPRINT ── */}
      {mapTheme === 'plano' ? (
        /* ── BESPOKE VECTOR SCHEMATIC BLUEPRINT VIEW ── */
        <div className="w-full h-full min-h-[550px] bg-[#0F172A] relative overflow-hidden flex flex-col items-center justify-center p-6 select-none">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(#10B981 1px, transparent 1px), radial-gradient(#10B981 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px',
            }}
          />

          <svg className="w-full h-full max-w-4xl max-h-[460px] relative z-10" viewBox="0 0 800 500" fill="none">
            <defs>
              <linearGradient id="ruwaVectorRouteGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#D4962A" />
                <stop offset="100%" stopColor="#D84420" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* City blocks */}
            <g opacity="0.3">
              <rect x="60" y="80" width="130" height="90" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
              <rect x="220" y="70" width="160" height="100" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
              <rect x="410" y="60" width="180" height="110" rx="8" fill="rgba(11,93,59,0.3)" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x="440" y="115" fill="#10B981" fontSize="11" fontWeight="bold">Sector Residencial</text>

              <rect x="70" y="210" width="120" height="120" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
              <rect x="220" y="210" width="150" height="130" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
              <rect x="400" y="210" width="190" height="120" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
              <rect x="620" y="190" width="130" height="140" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />

              <rect x="90" y="370" width="180" height="80" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
              <rect x="300" y="370" width="160" height="80" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
              <rect x="490" y="360" width="230" height="90" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
            </g>

            {/* Avenues */}
            <path d="M 30 190 L 770 190" stroke="#1E293B" strokeWidth="20" strokeLinecap="round" />
            <path d="M 30 190 L 770 190" stroke="#334155" strokeWidth="16" strokeLinecap="round" opacity="0.5" />
            <path d="M 30 350 L 770 350" stroke="#1E293B" strokeWidth="16" strokeLinecap="round" />
            <path d="M 30 350 L 770 350" stroke="#334155" strokeWidth="12" strokeLinecap="round" opacity="0.5" />
            <path d="M 205 30 L 205 470" stroke="#1E293B" strokeWidth="16" strokeLinecap="round" />
            <path d="M 205 30 L 205 470" stroke="#334155" strokeWidth="12" strokeLinecap="round" opacity="0.5" />
            <path d="M 390 30 L 390 470" stroke="#1E293B" strokeWidth="20" strokeLinecap="round" />
            <path d="M 390 30 L 390 470" stroke="#334155" strokeWidth="16" strokeLinecap="round" opacity="0.5" />
            <path d="M 605 30 L 605 470" stroke="#1E293B" strokeWidth="16" strokeLinecap="round" />
            <path d="M 605 30 L 605 470" stroke="#334155" strokeWidth="12" strokeLinecap="round" opacity="0.5" />

            {/* Glowing route line */}
            <path
              d="M 110 410 L 205 410 Q 205 350 205 350 L 390 350 L 390 190 L 605 190 L 605 120 L 670 120"
              stroke="#10B981"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.2"
              filter="url(#glow)"
            />
            <path
              d="M 110 410 L 205 410 Q 205 350 205 350 L 390 350 L 390 190 L 605 190 L 605 120 L 670 120"
              stroke="url(#ruwaVectorRouteGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 110 410 L 205 410 Q 205 350 205 350 L 390 350 L 390 190 L 605 190 L 605 120 L 670 120"
              stroke="#FFF5E8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 14"
              className="ruwa-route-pulse-dash"
            />

            {/* Origin */}
            <g transform="translate(110, 410)">
              <circle r="20" fill="#10B981" fillOpacity="0.15" />
              <circle r="12" fill="#0B5D3B" fillOpacity="0.3" />
              <circle r="8" fill="#0B5D3B" stroke="#FFF5E8" strokeWidth="2.5" />
              <circle r="3" fill="#D4962A" />
              <text x="-35" y="28" fill="#FFF5E8" fontSize="10" fontWeight="bold">Mi ubicación</text>
            </g>

            {/* Destination */}
            <g transform="translate(670, 120)">
              <rect x="-20" y="-20" width="40" height="40" rx="12" fill="#D84420" stroke="#FFF5E8" strokeWidth="2.5" transform="rotate(-45)" />
              <g transform="translate(-10, -10)">
                <path d="M10 2L2 9V17H18V9L10 2Z" fill="#FFF5E8" />
              </g>
              <rect x="-60" y="-48" width="120" height="24" rx="8" fill="#0B5D3B" stroke="#D4962A" strokeWidth="1.5" />
              <text x="0" y="-32" fill="#FFF5E8" fontSize="10" fontWeight="900" textAnchor="middle">
                {propertyTitle.length > 18 ? propertyTitle.slice(0, 18) + '…' : propertyTitle}
              </text>
            </g>
          </svg>

          <div
            className="absolute bottom-24 left-4 z-10 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(11, 93, 59, 0.9) 0%, rgba(8, 74, 47, 0.9) 100%)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(212, 150, 42, 0.4)',
              color: '#FFF5E8',
            }}
          >
            <Sparkles size={14} className="text-[#D4962A]" />
            <span>Plano Vectorial · RuwaJay Maps</span>
          </div>
        </div>
      ) : (
        /* ── INTERACTIVE LEAFLET MAP WITH REAL STREETS ── */
        <MapContainer
          center={[originLat, originLng]}
          zoom={13}
          scrollWheelZoom={true}
          zoomControl={false}
          attributionControl={false}
          className="w-full h-full z-0 min-h-[550px]"
          ref={(m) => {
            if (m) mapInstanceRef.current = m;
          }}
        >
          {/* Tile Layer */}
          <TileLayer
            key={activeTileLayer.url}
            url={activeTileLayer.url}
            maxNativeZoom={activeTileLayer.maxNativeZoom}
            maxZoom={activeTileLayer.maxZoom}
            attribution={activeTileLayer.attribution}
            className={mapTheme === 'satelite' ? '' : 'ruwa-custom-map-tiles-premium'}
          />

          {/* Smart Auto Bounds Manager */}
          <MapBoundsController
            coordinates={routeCoordinates}
            origin={liveOrigin}
            destination={liveDestination}
            targetFocus={targetFocus}
            vehiclePos={currentVehiclePos}
            followVehicle={followVehicle}
          />

          {/* Custom Floating Controls */}
          <CustomMapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFocusOrigin={handleFocusOrigin}
            onFocusDestination={handleFocusDestination}
            onRecenterRoute={handleRecenterRoute}
            onGetCurrentGPS={handleGetCurrentGPS}
            gpsLoading={gpsLoading}
            isTracking={isTracking}
          />

          {/* Alternative Route (Rendered softly if available) */}
          {alternativeRoute && alternativeRoute.coords.length > 1 && (
            <Polyline
              positions={alternativeRoute.coords}
              pathOptions={{
                color: '#94A3B8',
                weight: 5,
                opacity: 0.5,
                dashArray: '8, 10',
                lineCap: 'round',
                lineJoin: 'round',
              }}
              eventHandlers={{
                click: () => {
                  setSelectedRouteIndex(selectedRouteIndex === 0 ? 1 : 0);
                  speakAssistant('Cambiando a ruta alternativa.');
                },
              }}
            />
          )}

          {/* 1. Outer Glow Polyline Layer (Shortest Road Route) */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#10B981',
                weight: 12,
                opacity: 0.3,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {/* 2. Core Solid Road Polyline Layer */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#0B5D3B',
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {/* 3. Animated Pulse Ribbon */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#D4962A',
                weight: 3,
                opacity: 0.9,
                dashArray: '10, 14',
                className: 'ruwa-route-pulse-dash',
                lineCap: 'round',
              }}
            />
          )}

          {isTracking && gpsAccuracy && (
            <Circle
              center={[originLat, originLng]}
              radius={gpsAccuracy}
              pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.12, weight: 1.5 }}
            />
          )}

          {/* Origin Marker (Where the person is) */}
          <Marker position={[originLat, originLng]} icon={createOriginIcon()}>
            <Popup>
              <div className="p-2 text-center font-sans max-w-[200px]">
                <span
                  className="inline-block text-white text-[10px] font-black uppercase px-3 py-1 rounded-full mb-1.5"
                  style={{ background: 'linear-gradient(135deg, #0B5D3B, #10B981)' }}
                >
                  {isTracking ? '📡 GPS en Vivo' : '📍 Tu Ubicación'}
                </span>
                <p className="font-extrabold text-[#3B2118] text-xs">Punto de Partida</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {originLat.toFixed(5)}, {originLng.toFixed(5)}
                </p>
                {isTracking && gpsAccuracy && (
                  <p className={`text-[10px] font-bold mt-1 ${gpsAccuracy <= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Precisión estimada: ±{gpsAccuracy} m
                  </p>
                )}
                <div className="mt-2 text-[10px] text-[#0B5D3B] font-bold bg-[#0B5D3B]/10 p-1.5 rounded-lg">
                  A {distanceKm} km por calles reales
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker (Where the house is) */}
          <Marker
            position={[destLat, destLng]}
            icon={createDestinationIcon(propertyPrice)}
          >
            <Popup>
              <div className="p-2 max-w-[220px] text-center font-sans">
                {propertyThumbnail && (
                  <img
                    src={propertyThumbnail}
                    alt={propertyTitle}
                    className="w-full h-28 object-cover rounded-xl mb-2 shadow-md"
                  />
                )}
                <span
                  className="inline-block text-white text-[9px] font-black uppercase px-3 py-1 rounded-full mb-1.5"
                  style={{ background: 'linear-gradient(135deg, #D84420, #F07824)' }}
                >
                  🏠 Destino Confirmado
                </span>
                <p className="font-black text-[#3B2118] text-xs leading-tight line-clamp-2">
                  {propertyTitle}
                </p>
                <p className="text-[11px] font-semibold text-[#0B5D3B] mt-1">
                  {displayDestName}
                </p>
                {propertyPrice && (
                  <p className="text-xs font-black text-[#D84420] mt-1">
                    {formatPrice(propertyPrice)}/mes
                  </p>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Simulated Moving Traveler Marker */}
          {simulating && routeCoordinates.length > 1 && (
            <Marker
              position={currentVehiclePos}
              icon={createTravelerIcon(currentBearing)}
            >
              <Popup>
                <div className="p-2 text-center font-sans">
                  <p className="font-black text-[#0B5D3B] text-xs">🚗 En Camino</p>
                  <p className="text-[10px] text-gray-500">Navegación RuwaJay</p>
                  <p className="text-[10px] font-bold text-[#D4962A] mt-1">{progressPercent}% del recorrido</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      )}

      {/* ── STEP-BY-STEP MANEUVER DRAWER ── */}
      {showStepDrawer && (
        <div
          className="absolute top-44 right-4 w-80 max-h-[360px] rounded-2xl p-4 text-white z-30 flex flex-col"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.97) 0%, rgba(15, 23, 42, 0.93) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212, 150, 42, 0.35)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <div>
              <h4 className="font-black text-sm text-[#FFF5E8] flex items-center gap-1.5">
                <Layers size={16} className="text-[#D4962A]" />
                Pasos de la Ruta
              </h4>
              <p className="text-[10px] text-[#10B981] font-bold mt-0.5">
                Trazado por calles reales
              </p>
            </div>
            <button
              onClick={() => setShowStepDrawer(false)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="overflow-y-auto space-y-1.5 pr-1 flex-1 text-xs">
            {steps.map((st, i) => (
              <button
                key={i}
                onClick={() => {
                  if (st.location) setTargetFocus(st.location);
                  setSelectedStepIndex(i);
                  speakAssistant(st.instruction);
                }}
                className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                  selectedStepIndex === i
                    ? 'bg-[#0B5D3B]/60 border-[#D4962A]/60 text-white shadow-md'
                    : 'bg-white/5 border-white/5 text-white/75 hover:bg-white/10 hover:border-white/15'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: selectedStepIndex === i
                      ? 'linear-gradient(135deg, #D84420, #F07824)'
                      : 'rgba(216, 68, 32, 0.5)',
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-snug">{st.instruction}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#D4962A] font-extrabold bg-[#D4962A]/10 px-1.5 py-0.5 rounded">
                      {st.streetName}
                    </span>
                    <span className="text-[10px] text-white/50">
                      {Math.round(st.distance || 100)}m
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM RUWAJAY PREMIUM DASHBOARD HUD ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div
          className="m-3 p-3.5 sm:px-4 sm:py-3 rounded-[20px]"
          style={{
            background: 'rgba(11, 79, 51, .97)',
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(255,245,232,.2)',
            boxShadow: '0 12px 34px rgba(22,52,39,.22), inset 0 1px 0 rgba(255,255,255,.1)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Estimated Time, Distance & Street Summary */}
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1">
                <span
                  className="text-3xl sm:text-4xl font-black tracking-tight"
                  style={{
                  color: '#F2B544',
                  }}
                >
                  {durationMins}
                </span>
                <span className="text-xs font-bold text-white/70">min</span>
              </div>
              
              <div className="h-10 w-px bg-white/15 rounded-full" />
              
              <div>
                <span className="text-xs sm:text-sm font-black text-white block">
                  {distanceKm} km
                  <span className="text-white/60 font-bold text-[10px] ml-1">
                    {currentRoute?.trafficAware
                      ? (trafficDelayMins > 0 ? `(+${trafficDelayMins} min por tráfico)` : '(tráfico fluido)')
                      : '(sin tráfico en vivo)'}
                  </span>
                </span>
                <span className="text-[10px] font-bold text-[#FFF5E8]/60 truncate block max-w-[200px]">
                  {routeSummary}
                </span>
              </div>
            </div>

            {/* Camera Auto-follow Toggle */}
            {simulating && (
              <button
                onClick={() => setFollowVehicle(!followVehicle)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  followVehicle
                    ? 'bg-[#10B981] text-slate-950 border-[#10B981] shadow-md shadow-[#10B981]/30'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                }`}
                title="Cámara siguiendo al vehículo"
              >
                <Camera size={14} />
                <span>{followVehicle ? 'Siguiendo' : 'Seguir'}</span>
              </button>
            )}

            {/* Simulation & Controls */}
            <div className="flex items-center gap-2">
              {/* Speed Selector */}
              {simulating && (
                <button
                  onClick={() => setSimSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1))}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold text-[#D4962A] border border-white/10 hover:bg-white/10 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  title="Velocidad de simulación"
                >
                  {simSpeed}x
                </button>
              )}

              {/* Play / Pause Simulation */}
              <button
                onClick={() => {
                  if (simIndex >= routeCoordinates.length - 1) setSimIndex(0);
                  const nextSim = !simulating;
                  setSimulating(nextSim);
                  if (nextSim) {
                    setFollowVehicle(true);
                    speakAssistant(`Iniciando recorrido guiado.`);
                  } else {
                    speakAssistant('Recorrido pausado.');
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D84420] hover:bg-[#C93D1C] text-white font-black text-xs transition-all active:scale-[.98]"
                style={{
                  boxShadow: '0 7px 18px rgba(216,68,32,.28)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {simulating ? <Pause size={14} /> : <Play size={14} />}
                <span>{simulating ? 'Pausar' : 'Simular Recorrido'}</span>
              </button>

              {/* Reset Simulation */}
              <button
                onClick={() => {
                  setSimulating(false);
                  setSimIndex(0);
                  lastSpokenStepRef.current = -1;
                  speakAssistant('Recorrido reiniciado.');
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors border border-white/10"
                title="Reiniciar"
              >
                <RotateCcw size={15} />
              </button>

              {/* Recenter Route */}
              <button
                onClick={handleRecenterRoute}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors border border-white/10"
                title="Centrar ruta completa"
              >
                <Compass size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RUWAJAY OFFICIAL WATERMARK BADGE ── */}
      <div
        className="absolute bottom-24 left-4 z-10 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold"
        style={{
          background: 'linear-gradient(135deg, rgba(11, 93, 59, 0.92) 0%, rgba(8, 74, 47, 0.9) 100%)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212, 150, 42, 0.35)',
          color: '#FFF5E8',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}
      >
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
        <span>RuwaJay Maps · Navegación Oficial</span>
        {isTracking && (
          <span className="text-[#10B981] font-black ml-1">· GPS 📡</span>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#0B5D3B]/30 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-t-[#D4962A] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-sm">Calculando ruta óptima...</p>
              <p className="text-white/50 text-xs mt-1">RuwaJay Maps</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
