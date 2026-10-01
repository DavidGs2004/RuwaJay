import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Compass, AlertTriangle, ShieldCheck, Play, Pause, RotateCcw, Clock, MapPin, Gauge } from 'lucide-react';
import { formatDistance, formatPrice } from '../../data/properties';

// Waze Custom Vehicle Marker Icon
const vehicleIcon = L.divIcon({
  html: `
    <div class="relative w-10 h-10 flex items-center justify-center">
      <div class="absolute inset-0 rounded-full bg-[#05C3DD]/30 animate-ping"></div>
      <div class="w-8 h-8 rounded-full bg-[#05C3DD] border-2 border-white shadow-xl flex items-center justify-center transform -rotate-45">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 22L12 18L22 22L12 2Z"/>
        </svg>
      </div>
    </div>
  `,
  className: 'waze-vehicle-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Destination Pin Icon (Property Pin)
const destinationIcon = L.divIcon({
  html: `
    <div class="relative w-10 h-10 flex items-center justify-center">
      <div class="w-9 h-9 rounded-2xl bg-[#D84420] border-2 border-white shadow-xl flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `,
  className: 'waze-destination-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// Auto-recenter controller
function MapRecenter({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [coordinates, map]);

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function WazeNavigationView({ origin, destination, propertyTitle, propertyAddress }) {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeSegments, setRouteCoordinatesSegments] = useState([]);
  const [steps, setSteps] = useState([]);
  const [totalDistanceMeters, setTotalDistanceMeters] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const animRef = useRef(null);

  const originLat = origin?.lat ?? 14.6349;
  const originLng = origin?.lng ?? -90.5069;
  const destLat = destination?.lat ?? 14.595;
  const destLng = destination?.lng ?? -90.485;

  // Fetch real road route from OSRM Engine
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        const data = await res.json();

        if (isMounted && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const rawCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          setRouteCoordinates(rawCoords);
          setTotalDistanceMeters(route.distance);
          setTotalDurationSeconds(route.duration);

          // Extract steps
          const stepList = route.legs?.[0]?.steps?.map((step) => ({
            instruction: step.maneuver?.type === 'turn'
              ? `Gira a la ${step.maneuver?.modifier === 'left' ? 'izquierda' : 'derecha'} en ${step.name || 'la avenida'}`
              : step.maneuver?.type === 'roundabout'
              ? `En la rotonda toma la salida hacia ${step.name || 'tu destino'}`
              : `Avanza por ${step.name || 'la vía principal'}`,
            distance: step.distance,
            type: step.maneuver?.type || 'straight',
          })) || [];
          setSteps(stepList);

          // Segment route for traffic color coding (Green = Fluid, Yellow = Moderate, Red = Heavy)
          const segments = [];
          const chunkSize = Math.max(1, Math.floor(rawCoords.length / 3));

          for (let i = 0; i < rawCoords.length - 1; i += chunkSize) {
            const sub = rawCoords.slice(i, i + chunkSize + 1);
            if (sub.length < 2) continue;
            // First 60% fluid (green), middle 25% moderate (yellow), last 15% heavy traffic near destination (red)
            const ratio = i / rawCoords.length;
            const trafficColor = ratio < 0.55 ? '#10B981' : ratio < 0.80 ? '#F59E0B' : '#EF4444';
            const trafficStatus = ratio < 0.55 ? 'Fluido' : ratio < 0.80 ? 'Moderado' : 'Pesado';
            segments.push({ coords: sub, color: trafficColor, status: trafficStatus });
          }
          setRouteCoordinatesSegments(segments);
        }
      } catch (err) {
        console.warn("Error calculando ruta OSRM:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRoute();
    return () => { isMounted = false; };
  }, [originLat, originLng, destLat, destLng]);

  // Simulation playback
  useEffect(() => {
    if (simulating && routeCoordinates.length > 0) {
      animRef.current = setInterval(() => {
        setSimIndex((prev) => {
          if (prev >= routeCoordinates.length - 1) {
            setSimulating(false);
            return prev;
          }
          return prev + 1;
        });
      }, 400);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [simulating, routeCoordinates.length]);

  const currentVehiclePos = routeCoordinates[simIndex] || [originLat, originLng];
  const distanceKm = (totalDistanceMeters / 1000).toFixed(1);
  const durationMins = Math.round(totalDurationSeconds / 60) || 12;

  const currentNextStep = steps[0] || { instruction: 'Sigue directo hacia el inmueble', distance: 300 };

  return (
    <div className="relative w-full h-full min-h-[480px] overflow-hidden rounded-3xl border border-border-light shadow-card bg-[#1E293B]">

      {/* ── TOP WAZE HUD HEADER ── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-3 bg-[#0F172A]/90 backdrop-blur-md border border-[#05C3DD]/30 text-white p-3.5 rounded-2xl shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-[#05C3DD] text-slate-950 font-black flex items-center justify-center shrink-0 shadow-lg">
            <Navigation size={22} className="transform rotate-45" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#05C3DD]">
                Próxima Maniobra · En {Math.round(currentNextStep.distance || 250)}m
              </span>
            </div>
            <p className="text-sm font-black text-white truncate leading-tight">
              {currentNextStep.instruction}
            </p>
          </div>
        </div>
      </div>

      {/* ── LEAFLET MAP CONTAINER ── */}
      <MapContainer
        center={[originLat, originLng]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0 min-h-[480px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter coordinates={routeCoordinates} />

        {/* Traffic color-coded polyline segments */}
        {routeSegments.map((seg, idx) => (
          <Polyline
            key={idx}
            positions={seg.coords}
            pathOptions={{
              color: seg.color,
              weight: 8,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        ))}

        {/* Current Vehicle Position Marker */}
        <Marker position={currentVehiclePos} icon={vehicleIcon}>
          <Popup>
            <div className="p-2 text-center">
              <p className="font-extrabold text-forest text-xs">🚗 Vehículo en Ruta</p>
              <p className="text-[11px] text-text-muted">Simulación Waze en directo</p>
            </div>
          </Popup>
        </Marker>

        {/* Destination Marker */}
        <Marker position={[destLat, destLng]} icon={destinationIcon}>
          <Popup>
            <div className="p-2 text-center">
              <p className="font-black text-cafe text-xs">{propertyTitle || 'Destino'}</p>
              <p className="text-[11px] text-text-muted">{propertyAddress || 'Guatemala'}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* ── BOTTOM WAZE DASHBOARD HUD ── */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#0F172A]/95 backdrop-blur-md border border-[#05C3DD]/30 text-white p-4 rounded-3xl shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* ETA & Distance */}
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tight text-[#05C3DD]">{durationMins}</span>
              <span className="text-xs font-bold text-slate-300">min</span>
            </div>
            <div className="h-8 w-px bg-slate-700/60" />
            <div>
              <span className="text-sm font-extrabold text-white block">{distanceKm} km</span>
              <span className="text-[10px] font-bold text-slate-400">Ruta más corta</span>
            </div>
          </div>

          {/* Traffic Semaphore Badge */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
            <span className="text-xs font-black text-emerald-400">Tráfico Fluido (82%)</span>
          </div>

          {/* Simulation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (simIndex >= routeCoordinates.length - 1) setSimIndex(0);
                setSimulating(!simulating);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#05C3DD] text-slate-950 font-black text-xs shadow-md hover:bg-[#05C3DD]/90 transition-transform active:scale-95"
            >
              {simulating ? <Pause size={14} /> : <Play size={14} />}
              <span>{simulating ? 'Pausar' : 'Iniciar Simulación'}</span>
            </button>

            <button
              onClick={() => {
                setSimulating(false);
                setSimIndex(0);
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Reiniciar vehículo"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
