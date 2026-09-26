import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Bed, Bath, Car, Ruler, MapPin, Heart, Share2, Shield, Calendar, CheckCircle,
  MessageCircle, ChevronLeft, ChevronRight, X, Star, AlertTriangle,
  Calculator, ArrowLeftRight, FileText, Scale
} from 'lucide-react';
import { demoProperties, demoOwners, formatPrice, formatDistance, calculateDistance } from '../data/properties';
import { useFavorites } from '../context/FavoritesContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCompare } from '../context/CompareContext';
import { useAuth } from '../context/AuthContext';
import RuwaDatePicker from '../components/ui/RuwaDatePicker';
import PropertyReviews from '../components/property/PropertyReviews';
import PropertyLightbox from '../components/property/PropertyLightbox';
import LeaseContractModal from '../components/property/LeaseContractModal';
import RentAffordabilityModal from '../components/property/RentAffordabilityModal';
import { subscribeToProperties } from '../lib/propertyService';

function WhatsAppIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.17 8.17 0 0 1-5.82 2.41h-.01c-1.49 0-2.95-.4-4.23-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.25-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.49-1.39-1.74-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.79.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.21-.17-.46-.3z" />
    </svg>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { position } = useGeolocation();
  const { isInCompare, toggleCompare } = useCompare();
  const { user } = useAuth();
  const [firebaseProperties, setFirebaseProperties] = useState([]);

  useEffect(() => subscribeToProperties(setFirebaseProperties), []);

  const property = firebaseProperties.find((p) => p.id === id)
    || demoProperties.find((p) => p.id === id)
    || demoProperties[0];
  const owner = demoOwners.find((o) => o.id === property.ownerId) || demoOwners[0];
  const fav = isFavorite(property.id);
  const inCompare = isInCompare(property.id);

  const [activeTab, setActiveTab] = useState('todas');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Budget Calculator state
  const [maintenanceFee, setMaintenanceFee] = useState(350);
  const [contractCost, setContractCost] = useState(250);
  const [leaseMonths, setLeaseMonths] = useState(12);
  const [showCalcDetails, setShowCalcDetails] = useState(true);

  // Visit modal state
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showAffordabilityModal, setShowAffordabilityModal] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('10:00');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitSubmitted, setVisitSubmitted] = useState(false);

  useEffect(() => {
    if (!showLightbox && !showVisitModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      setShowLightbox(false);
      setShowVisitModal(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [showLightbox, showVisitModal]);

  const getCategoryImages = () => {
    if (activeTab === 'todas') return Object.values(property.images).flat();
    return property.images[activeTab] || [];
  };

  const currentImages = getCategoryImages().length > 0 ? getCategoryImages() : [property.thumbnail];

  const distance = position && property.coordinates?.lat && property.coordinates?.lng
    ? calculateDistance(position.lat, position.lng, property.coordinates.lat, property.coordinates.lng)
    : null;

  // WhatsApp configuration with prefilled message
  const ownerPhone = owner.phone || '+502 5482 9104';
  const cleanPhone = ownerPhone.replace(/\D/g, '');
  const propertyUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappMsg = encodeURIComponent(
    `¡Hola ${owner.name}! Vi tu propiedad "${property.title}" en RuwaJay (${property.currency || 'Q'}${property.price}/mes) y deseo consultar más información o coordinar una visita. Enlace: ${propertyUrl}`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMsg}`;

  const handleScheduleVisit = (e) => {
    e.preventDefault();
    if (!visitDate) return;

    // Create persistent visit record in localStorage (ruwajay_visits)
    const newVisit = {
      id: `visit-${Date.now()}`,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyImage: currentImages[0] || property.thumbnail || '',
      propertyPrice: property.price,
      propertyZone: property.address?.approximate || 'Guatemala',
      ownerId: property.ownerId || owner.id,
      ownerName: owner.name,
      ownerPhone: ownerPhone,
      tenantId: user?.id || 'guest',
      tenantName: user?.name || 'Inquilino interesado',
      tenantPhone: user?.phone || '',
      tenantEmail: user?.email || '',
      date: visitDate,
      time: visitTime,
      notes: visitNotes,
      status: 'pendiente', // 'pendiente' | 'confirmada' | 'reprogramada' | 'cancelada'
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('ruwajay_visits') || '[]');
      localStorage.setItem('ruwajay_visits', JSON.stringify([newVisit, ...existing]));
    } catch { /* ignore */ }

    setVisitSubmitted(true);
    setTimeout(() => {
      setShowVisitModal(false);
      setVisitSubmitted(false);
      navigate('/perfil?tab=visitas');
    }, 1500);
  };

  // Calculator computations
  const initialRent = Number(property.price) || 0;
  const depositAmount = Number(property.deposit) || initialRent;
  const totalInitialInvestment =
    initialRent + depositAmount + Number(maintenanceFee || 0) + Number(contractCost || 0);

  const projectedTotal =
    initialRent * leaseMonths +
    Number(maintenanceFee || 0) * leaseMonths +
    depositAmount +
    Number(contractCost || 0);
  const effectiveMonthly = Math.round((projectedTotal - depositAmount) / leaseMonths);

  return (
    <main className="min-h-screen bg-crema pb-24 pt-2 md:pb-12 md:pt-4">

      {/* ===== Top Navigation Bar ===== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 py-4 sm:py-5">
          <button
            onClick={() => navigate(-1)}
            className="group flex min-h-11 min-w-0 items-center gap-1 text-sm font-bold text-cafe transition-colors hover:text-forest sm:gap-2"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden min-[360px]:inline">Volver a la búsqueda</span>
            <span className="min-[360px]:hidden">Volver</span>
          </button>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Compare Button */}
            <button
              onClick={() => toggleCompare(property)}
              className={`flex h-11 items-center gap-1.5 px-3 rounded-xl border shadow-xs transition-all text-xs font-bold ${
                inCompare
                  ? 'bg-forest border-forest text-white shadow-md'
                  : 'bg-white border-border-light text-cafe hover:border-forest/30 hover:text-forest'
              }`}
              title={inCompare ? 'Quitar del comparador' : 'Comparar esta propiedad'}
            >
              <ArrowLeftRight size={16} />
              <span className="hidden sm:inline">{inCompare ? 'En comparador' : 'Comparar'}</span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Enlace copiado al portapapeles');
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-light bg-white text-cafe shadow-xs transition-all hover:border-forest/30 hover:text-forest"
              title="Compartir"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={() => toggleFavorite(property.id)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border shadow-xs transition-all ${
                fav
                  ? 'bg-terracota border-terracota text-white shadow-glow-terracota'
                  : 'bg-white border-border-light text-cafe hover:text-terracota hover:border-terracota/30'
              }`}
              title={fav ? 'Quitar de favoritos' : 'Guardar'}
            >
              <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Title & Location ===== */}
      <div className="mx-auto mb-6 max-w-7xl px-4 sm:mb-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <span className="px-3.5 py-1.5 bg-gradient-to-r from-forest to-jade text-white text-[11px] font-extrabold rounded-full capitalize tracking-wide shadow-sm">
            {property.type}
          </span>
          {property.verified && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-jade/10 text-jade text-[11px] font-bold rounded-full border border-jade/15">
              <CheckCircle size={12} /> Propietario Verificado
            </span>
          )}
          {property.isNew && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-naranja to-dorado text-white text-[11px] font-extrabold rounded-full shadow-sm">
              Nuevo
            </span>
          )}
        </div>

        <h1 className="break-words text-2xl font-extrabold leading-tight tracking-tight text-cafe sm:text-3xl lg:text-4xl">
          {property.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 mt-3">
          <span className="flex min-w-0 items-start gap-1.5 text-sm font-medium text-text-secondary">
            <MapPin size={16} className="mt-0.5 shrink-0 text-terracota" strokeWidth={2.5} />
            <span className="min-w-0 break-words">{property.address.approximate}</span>
          </span>
          {distance !== null && (
            <span className="text-sm font-bold text-azul-ruta">
              A {formatDistance(distance)} de tu ubicación
            </span>
          )}
        </div>
      </div>

      {/* ===== Gallery Section ===== */}
      <div className="mx-auto mb-7 max-w-7xl px-4 sm:mb-10 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-card border border-border-light overflow-hidden">
          {/* Main Image */}
          <div className="group relative aspect-[4/3] cursor-pointer overflow-hidden sm:aspect-[21/9]" onClick={() => setShowLightbox(true)}>
            <img
              src={currentImages[activeImageIndex] || property.thumbnail}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />

            {/* Nav arrows */}
            {currentImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => prev === 0 ? currentImages.length - 1 : prev - 1);
                  }}
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-cafe shadow-md backdrop-blur-sm transition-all hover:bg-white sm:left-4"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => prev === currentImages.length - 1 ? 0 : prev + 1);
                  }}
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-cafe shadow-md backdrop-blur-sm transition-all hover:bg-white sm:right-4"
                  aria-label="Foto siguiente"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Image counter */}
            <div className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-bold">
              {activeImageIndex + 1} / {currentImages.length}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-5 py-4 border-t border-border-light">
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'todas', label: 'Todas las fotos' },
                { id: 'fachada', label: 'Fachada' },
                { id: 'sala', label: 'Sala' },
                { id: 'cocina', label: 'Cocina' },
                { id: 'habitaciones', label: 'Habitaciones' },
                { id: 'banos', label: 'Baños' },
                { id: 'patio', label: 'Patio / Exterior' },
              ].map(({ id: catId, label }) => (
                <button
                  key={catId}
                  onClick={() => { setActiveTab(catId); setActiveImageIndex(0); }}
                   className={`min-h-11 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-bold transition-all duration-300 ${
                    activeTab === catId
                      ? 'bg-forest text-white shadow-sm'
                      : 'bg-crema text-cafe hover:bg-forest/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Main Content Grid ===== */}
      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left Column: Details */}
          <div className="order-2 space-y-6 lg:order-1 lg:col-span-2 lg:space-y-8">

            {/* Key Stats Bar */}
            <div className="rounded-2xl border border-border-light bg-white p-4 shadow-card sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
                {[
                  { icon: Bed, value: property.bedrooms, label: 'Habitaciones', color: 'text-forest' },
                  { icon: Bath, value: property.bathrooms, label: 'Baños', color: 'text-forest' },
                  { icon: Car, value: property.parking || 0, label: 'Parqueos', color: 'text-forest' },
                  { icon: Ruler, value: `${property.area} m²`, label: 'Área construida', color: 'text-forest' },
                ].map(({ icon: Icon, value, label, color }) => (
                  <div key={label} className="rounded-xl border border-border-light bg-crema/60 p-3 text-center sm:p-4">
                    <Icon size={24} className={`mx-auto ${color} mb-2`} strokeWidth={1.8} />
                    <span className="block text-xl font-extrabold text-cafe">{value}</span>
                    <span className="text-[11px] text-text-muted font-bold mt-1">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-border-light bg-white p-5 shadow-card sm:p-7">
              <h2 className="text-xl font-extrabold text-cafe mb-4 tracking-tight">Descripción</h2>
              <p className="text-text-secondary leading-relaxed whitespace-pre-line text-[15px]">
                {property.description}
              </p>
            </div>

            {/* Services */}
            <div className="rounded-2xl border border-border-light bg-white p-5 shadow-card sm:p-7">
              <h2 className="text-xl font-extrabold text-cafe mb-5 tracking-tight">Servicios e instalaciones</h2>
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3">
                {property.servicesIncluded?.map((srv) => (
                  <div key={srv} className="flex items-center gap-2.5 text-sm font-semibold text-cafe">
                    <div className="w-6 h-6 rounded-lg bg-jade/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={14} className="text-jade" />
                    </div>
                    {srv}
                  </div>
                ))}
                {property.furnished && (
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-cafe">
                    <div className="w-6 h-6 rounded-lg bg-jade/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={14} className="text-jade" />
                    </div>
                    Amueblada
                  </div>
                )}
                {property.petsAllowed && (
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-cafe">
                    <div className="w-6 h-6 rounded-lg bg-jade/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={14} className="text-jade" />
                    </div>
                    Se aceptan mascotas
                  </div>
                )}
                {property.patio && (
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-cafe">
                    <div className="w-6 h-6 rounded-lg bg-jade/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={14} className="text-jade" />
                    </div>
                    Patio / Jardín
                  </div>
                )}
              </div>
            </div>

            {/* Requirements & Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border-light bg-white p-5 shadow-card sm:p-7">
                <h3 className="font-extrabold text-cafe text-lg mb-4 flex items-center gap-2.5 tracking-tight">
                  <div className="w-8 h-8 rounded-xl bg-forest/10 flex items-center justify-center">
                    <Shield size={18} className="text-forest" />
                  </div>
                  Requisitos para alquilar
                </h3>
                <ul className="space-y-3">
                  {property.requirements?.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                      <span className="w-2 h-2 rounded-full bg-forest mt-1.5 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border-light bg-white p-5 shadow-card sm:p-7">
                <h3 className="font-extrabold text-cafe text-lg mb-4 flex items-center gap-2.5 tracking-tight">
                  <div className="w-8 h-8 rounded-xl bg-naranja/10 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-naranja" />
                  </div>
                  Normas de la vivienda
                </h3>
                <ul className="space-y-3">
                  {property.rules?.map((rule, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                      <span className="w-2 h-2 rounded-full bg-naranja mt-1.5 flex-shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Property Reviews & Ratings */}
            <PropertyReviews propertyId={property.id} propertyTitle={property.title} />
          </div>

          {/* ===== Right Column: Price & Owner ===== */}
          <div className="order-1 lg:order-2">
            <div className="space-y-6 lg:sticky lg:top-[182px]">

              {/* Price Card */}
              <div className="rounded-3xl border-2 border-forest/8 bg-white p-5 shadow-elevated sm:p-7">
                {/* Price */}
                <div className="mb-6 pb-6 border-b border-border-light">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-muted block mb-2">
                    Alquiler mensual
                  </span>
                  <div className="flex flex-wrap items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-forest sm:text-4xl">
                      {formatPrice(property.price)}
                    </span>
                    <span className="text-sm font-bold text-text-muted">/mes</span>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-text-secondary">
                    <span className="font-medium">Depósito de garantía:</span>
                    <span className="font-extrabold text-cafe">{formatPrice(property.deposit)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-text-secondary">
                    <span className="font-medium">Disponible desde:</span>
                    <span className="font-extrabold text-jade">{property.availableDate}</span>
                  </div>
                </div>

                {/* Owner Card */}
                <div className="flex items-center gap-3.5 mb-7 p-4 rounded-2xl bg-crema/50 border border-border-light">
                  <div className="w-13 h-13 rounded-full bg-gradient-to-br from-forest to-jade text-white font-extrabold text-lg flex items-center justify-center shadow-sm">
                    {owner.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-cafe text-sm flex items-center gap-1.5 truncate">
                      {owner.name}
                      {owner.verified && <CheckCircle size={14} className="text-jade flex-shrink-0" />}
                    </h4>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                      <span className="flex items-center gap-0.5 text-dorado font-extrabold">
                        <Star size={12} fill="currentColor" /> {owner.rating}
                      </span>
                      <span>• Resp. {owner.responseTime}</span>
                    </div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowVisitModal(true)}
                    className="btn-primary w-full !rounded-2xl !py-4"
                  >
                    <Calendar size={18} />
                    Solicitar una visita
                  </button>

                  {/* Direct WhatsApp Button */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold py-3.5 shadow-md shadow-[#25D366]/20 transition-all text-sm"
                  >
                    <WhatsAppIcon size={19} />
                    Contactar por WhatsApp
                  </a>

                  <Link
                    to={`/chat?property=${property.id}`}
                    className="btn-forest w-full !rounded-2xl !py-3.5 text-center"
                  >
                    <MessageCircle size={18} />
                    Enviar mensaje interno
                  </Link>
                </div>

                <p className="text-[11px] text-text-muted text-center mt-5 leading-normal px-2">
                  🔒 La dirección exacta se desbloqueará una vez el propietario acepte tu solicitud de visita.
                </p>
              </div>

              {/* ===== Budget & Initial Expense Calculator ===== */}
              <div className="rounded-3xl border border-border-light bg-white p-5 shadow-card sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-forest/10 flex items-center justify-center text-forest">
                      <Calculator size={19} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-cafe">Calculadora de Gastos</h3>
                      <p className="text-[11px] text-text-muted">Inversión inicial estimada en Quetzales</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCalcDetails(!showCalcDetails)}
                    className="text-xs font-bold text-forest hover:underline"
                  >
                    {showCalcDetails ? 'Ocultar' : 'Personalizar'}
                  </button>
                </div>

                {/* Total box */}
                <div className="rounded-2xl bg-gradient-to-br from-[#FAF5EE] to-crema p-4 border border-dorado/20 mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted block mb-1">
                    Inversión Inicial para Mudarte
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-forest sm:text-3xl">
                      {formatPrice(totalInitialInvestment)}
                    </span>
                    <span className="text-[11px] font-bold text-jade bg-jade/10 px-2 py-0.5 rounded-full">
                      Incluye depósito
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-2 leading-tight">
                    * El depósito ({formatPrice(depositAmount)}) es 100% reembolsable al finalizar tu contrato si el inmueble se entrega en buen estado.
                  </p>
                </div>

                {/* Customizable inputs & breakdown */}
                {showCalcDetails && (
                  <div className="space-y-3 pt-1 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                      <span className="text-text-secondary font-medium">1er mes de renta</span>
                      <span className="font-extrabold text-cafe">{formatPrice(initialRent)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                      <span className="text-text-secondary font-medium">Depósito de garantía (reembolsable)</span>
                      <span className="font-extrabold text-cafe">{formatPrice(depositAmount)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                      <label className="text-text-secondary font-medium">
                        Cuota de garita / mantenimiento
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-text-muted font-bold">Q</span>
                        <input
                          type="number"
                          value={maintenanceFee}
                          onChange={(e) => setMaintenanceFee(Math.max(0, Number(e.target.value)))}
                          className="w-20 rounded-lg border border-border bg-[#FDFBF7] px-2 py-1 text-right text-xs font-extrabold text-cafe outline-none focus:border-forest"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                      <label className="text-text-secondary font-medium">
                        Contrato y trámites legales
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-text-muted font-bold">Q</span>
                        <input
                          type="number"
                          value={contractCost}
                          onChange={(e) => setContractCost(Math.max(0, Number(e.target.value)))}
                          className="w-20 rounded-lg border border-border bg-[#FDFBF7] px-2 py-1 text-right text-xs font-extrabold text-cafe outline-none focus:border-forest"
                        />
                      </div>
                    </div>

                    {/* Lease Horizon Projection */}
                    <div className="pt-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted block mb-2">
                        Proyección según tiempo de estadía
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {[6, 12, 24].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setLeaseMonths(m)}
                            className={`rounded-xl py-2 text-xs font-bold transition-all ${
                              leaseMonths === m
                                ? 'bg-forest text-white shadow-xs'
                                : 'bg-[#FAF5EE] text-cafe hover:bg-forest/10'
                            }`}
                          >
                            {m} meses
                          </button>
                        ))}
                      </div>

                      <div className="rounded-2xl bg-[#FAF5EE] p-3 text-xs space-y-1.5 border border-border-light">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Costo total acumulado:</span>
                          <span className="font-extrabold text-cafe">{formatPrice(projectedTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Gasto mensual real promedio:</span>
                          <span className="font-extrabold text-forest">{formatPrice(effectiveMonthly)}/mes</span>
                        </div>
                      </div>
                    </div>

                    {/* Legal & Financial tools for this property */}
                    <div className="pt-3 border-t border-border-light/80 space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowContractModal(true)}
                        className="w-full flex items-center justify-between gap-2 p-3 rounded-2xl border border-forest/20 bg-forest/5 text-forest hover:bg-forest/10 transition-colors text-xs font-bold"
                      >
                        <span className="flex items-center gap-2">
                          <FileText size={16} />
                          Borrador de Contrato (PDF)
                        </span>
                        <span className="text-[10px] bg-white border border-forest/20 px-2 py-0.5 rounded-full">
                          Leyes GT
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAffordabilityModal(true)}
                        className="w-full flex items-center justify-between gap-2 p-3 rounded-2xl border border-border bg-[#FAF5EE] text-cafe hover:bg-white transition-colors text-xs font-bold"
                      >
                        <span className="flex items-center gap-2">
                          <Calculator size={16} className="text-terracota" />
                          ¿Cuánto puedo pagar? (Regla 30/70)
                        </span>
                        <span className="text-[10px] text-text-muted">Simular</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Luxury Lightbox Component ===== */}
      <PropertyLightbox
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        images={currentImages}
        initialIndex={activeImageIndex}
        propertyTitle={property.title}
      />

      {/* ===== Guatemalan Lease Contract Generator ===== */}
      <LeaseContractModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        property={property}
        owner={owner}
        user={user}
      />

      {/* ===== Rent Affordability Financial Calculator ===== */}
      <RentAffordabilityModal
        isOpen={showAffordabilityModal}
        onClose={() => setShowAffordabilityModal(false)}
        onApplyBudgetFilter={(maxBudget) => {
          navigate(`/explorar?maxPrice=${maxBudget}`);
        }}
        onSelectSuggestedLocation={(loc, maxBudget) => {
          navigate(`/explorar?maxPrice=${maxBudget}&department=${encodeURIComponent(loc.dept || '')}&zone=${encodeURIComponent(loc.zone || '')}`);
        }}
      />

      {/* ===== Visit Request Modal ===== */}
      {showVisitModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-4">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-popup animate-slide-up sm:max-h-[calc(100dvh-2rem)]">
            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 border-b border-border-light bg-crema/30 px-5 py-4 sm:px-7 sm:py-5">
              <h3 className="font-extrabold text-cafe text-lg tracking-tight">Agendar visita presencial</h3>
              <button onClick={() => setShowVisitModal(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-cafe/5 hover:text-cafe" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-7">
              {visitSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-18 h-18 bg-jade/10 text-jade rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle size={40} />
                  </div>
                  <h4 className="font-extrabold text-cafe text-xl mb-2">¡Solicitud enviada!</h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    El propietario revisará tu fecha propuesta.<br />Te redirigiremos a la vista de ruta...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleScheduleVisit} className="space-y-5">
                  <div>
                    <RuwaDatePicker
                      label="Fecha de la visita"
                      required
                      placeholder="Selecciona la fecha para tu visita"
                      minDate={new Date().toISOString().split('T')[0]}
                      value={visitDate}
                      onChange={(val) => setVisitDate(val)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-cafe mb-2">Hora preferida</label>
                    <select
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border-light text-sm font-medium text-cafe focus:border-forest focus:ring-2 focus:ring-forest/10 outline-none transition-all"
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="16:00">04:00 PM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-cafe mb-2">Nota adicional para el propietario</label>
                    <textarea
                      rows={3}
                      placeholder="Hola, me gustaría visitar la propiedad..."
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border-light text-sm font-medium text-cafe focus:border-forest focus:ring-2 focus:ring-forest/10 outline-none transition-all resize-none"
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full !rounded-xl !py-3.5">
                    Confirmar solicitud
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
