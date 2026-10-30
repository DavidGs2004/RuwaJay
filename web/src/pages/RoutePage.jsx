import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Navigation, MapPin, Clock, Car, Footprints, Share2, CheckCircle,
  ArrowLeft, ShieldAlert, PhoneCall, Copy, Check, MessageSquare,
  Sparkles, Download, Compass, ExternalLink, ShieldCheck, Home, Phone,
  Info, AlertTriangle, LocateFixed, CloudRain, AlertOctagon, Activity
} from 'lucide-react';
import { formatDistance, calculateDistance, formatPrice } from '../data/properties';
import { useGeolocation } from '../hooks/useGeolocation';
import { subscribeToProperties, readLocalCustomProperties } from '../lib/propertyService';
import RuwaJayNavigationView from '../components/map/RuwaJayNavigationView';

export default function RoutePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { position, requestPosition, loading: locationLoading, error: locationError } = useGeolocation();

  const [firebaseProperties, setFirebaseProperties] = useState([]);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mode, setMode] = useState('driving'); // 'driving' | 'walking'
  const [activeRouteInfo, setActiveRouteInfo] = useState(null);

  // Automatically request GPS position on page load
  useEffect(() => {
    requestPosition();
  }, [requestPosition]);

  useEffect(() => {
    const unsubscribe = subscribeToProperties(setFirebaseProperties);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const propertyId = searchParams.get('property') || 'prop-1';

  const property = firebaseProperties.find((p) => p.id === propertyId);

  const destination = property?.coordinates || property?.location?.mapCoordinates;
  const origin = position || { lat: 14.6349, lng: -90.5069 };

  if (!property) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-terracota/10 text-terracota flex items-center justify-center mb-4">
          <Home size={32} />
        </div>
        <h2 className="text-xl font-black text-cafe mb-2">Vivienda no encontrada</h2>
        <p className="text-sm text-text-muted mb-6 max-w-md">
          No pudimos localizar la propiedad seleccionada. Puedes regresar al explorador para elegir otra vivienda.
        </p>
        <Link to="/explorar" className="btn-primary">
          Explorar Viviendas
        </Link>
      </main>
    );
  }

  if (!destination) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-dorado/15 text-dorado flex items-center justify-center mb-4">
          <MapPin size={32} />
        </div>
        <h2 className="text-xl font-black text-cafe mb-2">Ubicación en validación</h2>
        <p className="text-sm text-text-muted mb-6 max-w-md">
          Esta propiedad aún no tiene sus coordenadas fijadas en el mapa. Contacta al anfitrión por chat para coordinar la visita.
        </p>
        <Link to={`/propiedad/${property.id}`} className="btn-secondary">
          Volver a la propiedad
        </Link>
      </main>
    );
  }

  const currentDestTitle = activeRouteInfo?.customDestName || property.title;
  const currentDestAddress = activeRouteInfo?.customDestAddress || property.address?.exact || property.exactAddress || property.address?.approximate || 'Ubicación no indicada';

  const rawDistKm = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);

  // Real road metrics computed by OSRM shortest street path
  const currentDistText = activeRouteInfo?.distanceKm
    ? `${activeRouteInfo.distanceKm} km`
    : formatDistance(rawDistKm);
  const currentTimeText = activeRouteInfo?.durationMins
    ? `${activeRouteInfo.durationMins} min`
    : (mode === 'driving'
      ? `${Math.max(5, Math.round(rawDistKm * 2.5 + 4))} min`
      : `${Math.max(10, Math.round(rawDistKm * 14))} min`);

  // WhatsApp arrival notification link
  const ownerPhone = property.ownerPhone || '50200000000';
  const cleanPhone = ownerPhone.replace(/[^\d]/g, '');
  const arrivalWhatsappText = encodeURIComponent(
    `Hola, voy en camino a la visita de "${currentDestTitle}" guiándome con el mapa oficial de RuwaJay. Mi tiempo estimado de llegada es de aproximadamente ${currentTimeText} (${currentDistText}).`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('502') ? cleanPhone : '502' + cleanPhone}?text=${arrivalWhatsappText}`;

  // Share verified route
  const handleShareRoute = () => {
    if (navigator.share) {
      navigator.share({
        title: `Ruta Oficial RuwaJay: ${property.title}`,
        text: `Voy en camino a la visita de ${property.title} en ${property.address?.exact || property.title}. Trazado oficial en RuwaJay.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Copy GPS Coordinates
  const handleCopyCoordinates = () => {
    const coordsStr = `${destination.lat.toFixed(6)}, ${destination.lng.toFixed(6)}`;
    navigator.clipboard?.writeText(coordsStr);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 3000);
  };

  // Print arrival route sheet
  const handlePrintRoute = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-crema/30 pb-24 pt-2 md:pb-12 md:pt-4">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Top Bar */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex min-h-11 items-center gap-1.5 text-sm font-bold text-cafe transition-colors hover:text-forest"
          >
            <ArrowLeft size={18} />
            Volver a la propiedad
          </button>
          
          <div className="flex items-center gap-2">
            <span className="flex min-h-9 items-center gap-1.5 rounded-full bg-forest/10 border border-forest/20 px-3 py-1 text-xs font-black text-forest">
              <Sparkles size={14} className="text-dorado" /> Mapa Oficial RuwaJay
            </span>
            <span className="flex min-h-9 items-center gap-1.5 rounded-full bg-jade/10 px-3 py-1 text-xs font-bold text-jade">
              <CheckCircle size={14} /> Visita Habilitada
            </span>
          </div>
        </div>

        {/* Hero Banner with Unlocked Exact Address */}
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-forest via-[#0e7048] to-jade p-5 text-white shadow-2xl sm:mb-8 sm:p-6 border border-white/10">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm text-xs font-black rounded-full mb-3 text-white border border-white/25">
              <Compass size={13} className="text-dorado" /> Trazado de Ruta y Navegación en Vivo
            </div>
            
            <h1 className="mb-1 break-words text-2xl font-black sm:text-3xl text-white tracking-tight">
              {property.title}
            </h1>
            
            <p className="mt-2 flex min-w-0 items-start gap-1.5 text-base font-bold text-white/95 sm:text-lg">
              <MapPin size={20} className="mt-0.5 shrink-0 text-dorado" />
              <span className="min-w-0 break-words">
                {property.address?.exact || property.exactAddress || property.address?.approximate || 'Ubicación no indicada'}
              </span>
            </p>
          </div>

          {/* Decorative Background Motif */}
          <div className="absolute right-4 -bottom-10 opacity-10 pointer-events-none select-none">
            <Navigation size={220} className="transform rotate-45 text-white" />
          </div>
        </div>

        {/* GPS Location Instant-Start Banner */}
        <div className={`mb-6 rounded-2xl p-4 transition-all border ${
          position
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 '
            : 'bg-gradient-to-r from-terracota via-naranja to-dorado text-white shadow-lg border-white/20'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                position ? 'bg-emerald-600 text-white' : 'bg-white/20 backdrop-blur-md text-white'
              }`}>
                <LocateFixed size={22} className={position ? '' : 'animate-pulse'} />
              </div>
              <div>
                <p className="text-sm font-black">
                  {position
                    ? 'Ruta trazada en vivo desde tu ubicación real (GPS Activo)'
                    : '¿Deseas iniciar la ruta desde tu ubicación actual?'}
                </p>
                <p className={`text-xs ${position ? 'opacity-80' : 'text-white/90'}`}>
                  {position
                    ? 'El trazado utiliza las calles y avenidas reales más cortas hacia la vivienda.'
                    : 'Activa tu GPS para calcular exactamente la distancia, tiempo de viaje, tráfico y lluvias.'}
                </p>
              </div>
            </div>

            <button
              onClick={requestPosition}
              disabled={locationLoading}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all active:scale-95 shrink-0 ${
                position
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-cafe hover:bg-crema shadow-md'
              }`}
            >
              <LocateFixed size={16} />
              {locationLoading
                ? 'Localizando GPS...'
                : position
                  ? 'Actualizar mi ubicación'
                  : 'Iniciar en mi ubicación'}
            </button>
          </div>
        </div>

        {/* ── PROPRIETARY RUWAJAY INTERACTIVE MAP & ROUTE TRACER ── */}
        <div className="mb-8 h-[480px] sm:h-[560px] w-full rounded-3xl overflow-hidden shadow-2xl border border-border-light relative z-0">
          <RuwaJayNavigationView
            origin={origin}
            destination={destination}
            propertyTitle={property.title}
            propertyAddress={property.address?.exact || property.address?.approximate}
            propertyPrice={property.price}
            propertyThumbnail={property.thumbnail || (property.images && property.images[0])}
            mode={mode}
            onRouteChange={setActiveRouteInfo}
          />
        </div>

        {/* Route Details and Actions Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          
          {/* Main Route Summary & Maneuvers */}
          <div className="space-y-6 rounded-3xl bg-white p-5 shadow-card sm:p-7 md:col-span-2 border border-border-light">
            <div className="flex flex-col items-stretch gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-black text-cafe text-lg flex items-center gap-2">
                  <Navigation size={20} className="text-forest" />
                  Resumen de Ruta RuwaJay
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Trayectoria calculada en tiempo real hacia la vivienda
                </p>
              </div>

              {/* Mode switch */}
              <div className="grid w-full grid-cols-2 rounded-xl bg-crema p-1 sm:w-auto border border-border">
                <button
                  onClick={() => setMode('driving')}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                    mode === 'driving'
                      ? 'bg-forest text-white shadow-sm'
                      : 'text-cafe hover:bg-forest/10'
                  }`}
                >
                  <Car size={15} /> En Automóvil
                </button>
                <button
                  onClick={() => setMode('walking')}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                    mode === 'walking'
                      ? 'bg-forest text-white shadow-sm'
                      : 'text-cafe hover:bg-forest/10'
                  }`}
                >
                  <Footprints size={15} /> Caminando
                </button>
              </div>
            </div>

            {/* Origin vs Destination Identification Card */}
            <div className="rounded-2xl border border-border bg-crema/40 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Point A: User's location */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-border-light shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-forest text-white flex items-center justify-center shrink-0 shadow-sm">
                    <LocateFixed size={20} className="text-dorado" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-forest block">
                      Punto A · Dónde estás tú
                    </span>
                    <p className="font-extrabold text-cafe text-sm truncate">
                      {position ? 'Tu ubicación actual (GPS)' : (locationLoading ? 'Obteniendo tu ubicación...' : 'Ubicación de referencia')}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Coordenadas: {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
                    </p>
                    {locationError && (
                      <button
                        type="button"
                        onClick={requestPosition}
                        className="mt-1 text-[11px] font-black text-terracota hover:underline"
                      >
                        Activar ubicación para iniciar desde donde estoy
                      </button>
                    )}
                  </div>
                </div>

                {/* Point B: House destination */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-border-light shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-terracota text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Home size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-terracota block">
                      Punto B · Hacia dónde vas
                    </span>
                    <p className="font-extrabold text-cafe text-sm truncate">
                      {currentDestTitle}
                    </p>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {currentDestAddress}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metric telemetry widgets: Tiempo con factores, Distancia en calles reales, Tráfico/Lluvia, Obstáculos/Choques */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
              {/* Widget 1: Tiempo Real */}
              <div className="rounded-2xl border border-forest/15 bg-forest/5 p-4 text-center transition-all shadow-xs">
                <Clock size={24} className="mx-auto text-forest mb-1.5" />
                <span className="block text-2xl sm:text-3xl font-black text-cafe">{currentTimeText}</span>
                <span className="text-xs text-text-muted font-bold block">Tiempo Estimado</span>
                {activeRouteInfo?.realWorld && (
                  <span className="text-[10px] text-forest font-extrabold mt-1 block">
                    (Base: {activeRouteInfo.realWorld.baseDurationMins}m + {activeRouteInfo.realWorld.totalAdjustedMins - activeRouteInfo.realWorld.baseDurationMins}m factores)
                  </span>
                )}
              </div>

              {/* Widget 2: Distancia Vial Real */}
              <div className="rounded-2xl border border-terracota/15 bg-terracota/5 p-4 text-center transition-all shadow-xs">
                <MapPin size={24} className="mx-auto text-terracota mb-1.5" />
                <span className="block text-2xl sm:text-3xl font-black text-cafe">{currentDistText}</span>
                <span className="text-xs text-text-muted font-bold block">Distancia Más Corta</span>
                <span className="text-[10px] text-terracota font-extrabold mt-1 block">
                  Por calles reales
                </span>
              </div>

              {/* Widget 3: Tráfico y Lluvia */}
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center transition-all shadow-xs">
                <CloudRain size={24} className="mx-auto text-amber-600 mb-1.5" />
                <span className="block text-sm font-black text-cafe mt-1 line-clamp-1">
                  {activeRouteInfo?.realWorld?.trafficLabel || 'Tráfico fluido'}
                </span>
                <span className="text-[10px] text-text-muted font-bold block mt-0.5 line-clamp-1">
                  {activeRouteInfo?.realWorld?.rainLabel || 'Clima regular'}
                </span>
                {activeRouteInfo?.realWorld && (
                  <span className="text-[10px] text-amber-700  font-extrabold mt-1 block">
                    +{activeRouteInfo.realWorld.trafficDelayMins}m tráfico · +{activeRouteInfo.realWorld.rainDelayMins}m clima
                  </span>
                )}
              </div>

              {/* Widget 4: Obstáculos y Choques */}
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-center transition-all shadow-xs">
                <AlertOctagon size={24} className="mx-auto text-orange-600 mb-1.5" />
                <span className="block text-sm font-black text-cafe mt-1 line-clamp-1">
                  {activeRouteInfo?.realWorld?.incidentLabel || 'Vía sin choques'}
                </span>
                <span className="text-[10px] text-text-muted font-bold block mt-0.5 line-clamp-1">
                  {activeRouteInfo?.realWorld?.obstacleLabel || 'Túmulos y semáforos'}
                </span>
                {activeRouteInfo?.realWorld && (
                  <span className="text-[10px] text-orange-700  font-extrabold mt-1 block">
                    +{activeRouteInfo.realWorld.obstacleDelayMins}m giros/túmulos
                  </span>
                )}
              </div>
            </div>

            {/* Turn by turn steps overview */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-cafe text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-jade" />
                  Pauta de Llegada y Puntos de Referencia
                </h3>
                <span className="text-xs font-bold text-forest bg-forest/10 px-2 py-0.5 rounded-full">
                  Sector Seguro
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-crema/60 border border-border-light text-sm">
                  <div className="w-6 h-6 rounded-full bg-forest text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-cafe font-bold">Punto de partida configurado</p>
                    <p className="text-xs text-text-muted">Inicia tu trayecto guiándote por la línea trazada en el mapa superior.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-crema/60 border border-border-light text-sm">
                  <div className="w-6 h-6 rounded-full bg-dorado text-cafe text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-cafe font-bold">Vía principal del sector</p>
                    <p className="text-xs text-text-muted">Avanza siguiendo los puntos de control intermedios y el velocímetro en vivo.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-terracota/10 border border-terracota/20 text-sm">
                  <div className="w-6 h-6 rounded-full bg-terracota text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-cafe font-black">Llegada a la propiedad</p>
                    <p className="text-xs text-text-secondary">
                      {property.address?.exact || property.exactAddress || property.title}. Presenta tu código de visita al llegar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Native Action Sidebar */}
          <div className="space-y-4">
            
            {/* Coordination Card */}
            <div className="bg-white rounded-3xl p-6 shadow-card space-y-4 border border-border-light">
              <h3 className="font-black text-cafe text-base flex items-center gap-2">
                <Sparkles size={18} className="text-dorado" />
                Coordinar con el Anfitrión
              </h3>

              {/* Direct WhatsApp notify */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} />
                Avisar por WhatsApp: Voy en camino
              </a>

              {/* In-app chat */}
              <Link
                to={`/chat?property=${property.id}`}
                className="w-full py-3.5 px-4 bg-forest hover:bg-forest-dark text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-center"
              >
                <MessageSquare size={18} />
                Abrir Chat RuwaJay en Vivo
              </Link>

              {/* Share Route Link */}
              <button
                onClick={handleShareRoute}
                className="w-full py-3 px-4 rounded-xl bg-crema hover:bg-forest/10 text-cafe font-extrabold text-xs transition-all flex items-center justify-center gap-2 border border-border"
              >
                {copiedLink ? <Check size={16} className="text-jade" /> : <Share2 size={16} className="text-forest" />}
                {copiedLink ? '¡Enlace de ruta copiado!' : 'Compartir ruta de seguridad'}
              </button>

              {/* Copy GPS Coordinates */}
              <button
                onClick={handleCopyCoordinates}
                className="w-full py-3 px-4 rounded-xl bg-crema hover:bg-forest/10 text-cafe font-extrabold text-xs transition-all flex items-center justify-center gap-2 border border-border"
              >
                {copiedCoords ? <Check size={16} className="text-jade" /> : <Copy size={16} className="text-terracota" />}
                {copiedCoords ? '¡Coordenadas copiadas!' : 'Copiar Coordenadas GPS RuwaJay'}
              </button>

              {/* Download / Print Route Sheet */}
              <button
                onClick={handlePrintRoute}
                className="w-full py-3 px-4 rounded-xl bg-crema hover:bg-forest/10 text-cafe font-extrabold text-xs transition-all flex items-center justify-center gap-2 border border-border"
              >
                <Download size={16} className="text-dorado" />
                Imprimir / Guardar Hoja de Ruta
              </button>
            </div>

            {/* RuwaJay Safety Notice */}
            <div className="bg-[#FFF5E8]  rounded-3xl p-5 border border-[#E8D9C8]  flex items-start gap-3 shadow-xs">
              <ShieldAlert size={24} className="text-terracota shrink-0 mt-0.5" />
              <div className="text-xs text-text-secondary  leading-relaxed">
                <span className="font-black text-cafe  block mb-1">Visita 100% Segura RuwaJay:</span>
                Recuerda que no requieres realizar pagos por adelantado para visitar. Verifica el estado físico del inmueble y el contrato antes de transferir.
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
