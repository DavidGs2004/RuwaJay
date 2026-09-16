import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Navigation, MapPin, Clock, Car, Footprints, ExternalLink, Share2,
  CheckCircle, ArrowLeft, ShieldAlert, PhoneCall
} from 'lucide-react';
import { demoProperties, formatDistance, calculateDistance } from '../data/properties';
import { useGeolocation } from '../hooks/useGeolocation';

export default function RoutePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { position } = useGeolocation();

  const propertyId = searchParams.get('property') || 'prop-1';
  const property = demoProperties.find((p) => p.id === propertyId) || demoProperties[0];

  const [mode, setMode] = useState('driving'); // 'driving' | 'walking'
  const [isNavigating, setIsNavigating] = useState(false);

  // User position fallback (Guatemala City center) if geo not granted
  const origin = position || { lat: 14.6349, lng: -90.5069 };
  const destination = property.coordinates;

  const rawDistKm = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);

  // Estimated times
  const drivingTimeMins = Math.max(5, Math.round(rawDistKm * 2.5 + 4));
  const walkingTimeMins = Math.max(10, Math.round(rawDistKm * 14));

  const currentDistText = formatDistance(rawDistKm);
  const currentTimeText = mode === 'driving' ? `${drivingTimeMins} min` : `${walkingTimeMins} min`;

  // Waze & Google Maps URL generators
  const wazeUrl = `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${mode === 'driving' ? 'driving' : 'walking'}`;

  const handleShareRoute = () => {
    if (navigator.share) {
      navigator.share({
        title: `Ruta a ${property.title}`,
        text: `Voy en camino a la visita de la propiedad en ${property.address.exact}.`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace de ruta copiado para compartir con tu persona de confianza.');
    }
  };

  return (
    <main className="min-h-screen bg-crema/30 pb-24 pt-2 md:pb-12 md:pt-4">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex min-h-11 items-center gap-1.5 text-sm font-bold text-cafe transition-colors hover:text-forest"
          >
            <ArrowLeft size={18} />
            Volver
          </button>
          <span className="flex min-h-9 items-center gap-1.5 rounded-full bg-jade/10 px-3 py-1 text-xs font-bold text-jade">
            <CheckCircle size={14} /> Visita Confirmada
          </span>
        </div>

        {/* Banner with Exact Address unlocked */}
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-forest to-jade p-5 text-white shadow-xl sm:mb-8 sm:p-6">
          <div className="relative z-10">
            <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-xs font-bold rounded-full mb-3">
              🔓 Dirección exacta desbloqueada
            </div>
            <h1 className="mb-1 break-words text-2xl font-extrabold sm:text-3xl">{property.title}</h1>
            <p className="mt-2 flex min-w-0 items-start gap-1.5 text-base font-bold text-white/90 sm:text-lg">
              <MapPin size={20} className="mt-0.5 shrink-0 text-terracota" />
              <span className="min-w-0 break-words">{property.address.exact}</span>
            </p>
          </div>
        </div>

        {/* Route Info Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {/* Main Route Specs */}
          <div className="space-y-6 rounded-3xl bg-white p-4 shadow-card sm:p-6 md:col-span-2">
            <div className="flex flex-col items-stretch gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-extrabold text-cafe text-lg flex items-center gap-2">
                <Navigation size={20} className="text-azul-ruta" />
                Resumen del recorrido
              </h2>
              {/* Transport mode selector */}
              <div className="grid w-full grid-cols-2 rounded-xl bg-crema p-1 sm:w-auto">
                <button
                  onClick={() => setMode('driving')}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-all sm:px-3 ${
                    mode === 'driving' ? 'bg-azul-ruta text-white shadow-sm' : 'text-cafe hover:bg-forest/10'
                  }`}
                >
                  <Car size={15} /> Automóvil
                </button>
                <button
                  onClick={() => setMode('walking')}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-all sm:px-3 ${
                    mode === 'walking' ? 'bg-azul-ruta text-white shadow-sm' : 'text-cafe hover:bg-forest/10'
                  }`}
                >
                  <Footprints size={15} /> Caminando
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-center min-[360px]:grid-cols-2 sm:gap-4">
              <div className="rounded-2xl border border-azul-ruta/10 bg-azul-ruta/5 p-3 sm:p-4">
                <Clock size={24} className="mx-auto text-azul-ruta mb-1" />
                <span className="block text-xl font-extrabold text-cafe sm:text-2xl">{currentTimeText}</span>
                <span className="text-xs text-text-muted font-semibold">Tiempo estimado</span>
              </div>
              <div className="rounded-2xl border border-azul-ruta/10 bg-azul-ruta/5 p-3 sm:p-4">
                <MapPin size={24} className="mx-auto text-azul-ruta mb-1" />
                <span className="block text-xl font-extrabold text-cafe sm:text-2xl">{currentDistText}</span>
                <span className="text-xs text-text-muted font-semibold">Distancia total</span>
              </div>
            </div>

            {/* Turn by turn mockup steps */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-cafe text-sm uppercase tracking-wider">Indicaciones principales</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-crema/40 text-sm">
                  <div className="w-6 h-6 rounded-full bg-azul-ruta text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <p className="text-cafe font-medium">Inicia tu recorrido desde tu posición actual hacia la avenida principal.</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-crema/40 text-sm">
                  <div className="w-6 h-6 rounded-full bg-azul-ruta text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <p className="text-cafe font-medium">Sigue recto hasta la entrada de {property.address.zone || property.address.municipality}.</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-crema/40 text-sm">
                  <div className="w-6 h-6 rounded-full bg-terracota text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <p className="text-cafe font-medium">Destino final: {property.address.exact}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Action Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 shadow-card space-y-3">
              <h3 className="font-extrabold text-cafe text-base mb-2">Abrir en tu app preferida</h3>
              
              <a
                href={wazeUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-[#33CCFF] hover:bg-[#28b8e6] text-cafe font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                Abrir en Waze
              </a>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-[#4285F4] hover:bg-[#3367d6] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                Abrir en Google Maps
              </a>

              <button
                onClick={handleShareRoute}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-crema px-3 py-3 text-center text-sm font-bold leading-snug text-cafe transition-all hover:bg-forest/10"
              >
                <Share2 size={18} className="text-forest" />
                Compartir recorrido de confianza
              </button>
            </div>

            {/* Safety card */}
            <div className="bg-crema/80 rounded-2xl p-4 border border-border flex items-start gap-3">
              <ShieldAlert size={22} className="text-terracota flex-shrink-0 mt-0.5" />
              <div className="text-xs text-text-secondary leading-relaxed">
                <span className="font-bold text-cafe block mb-0.5">Recomendación de seguridad:</span>
                Revisa la propiedad en persona antes de realizar cualquier tipo de depósito. RuwaJay no requiere pagos por adelantado para visitar.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
